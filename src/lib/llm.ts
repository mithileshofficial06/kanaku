// LLM layer (NVIDIA NIM via the OpenAI-compatible API). Server only.
// The LLM never computes numbers: it reads, labels and explains facts the engine computed,
// and every citation and rupee figure it writes is checked against those facts.
import OpenAI from "openai";
import type { Category } from "./engine/categorise";
import type { Report } from "./engine/analyze";
import type { Txn } from "./types";
import { inr, lakh } from "./format";

const SMART = process.env.NIM_MODEL_SMART || "nvidia/nemotron-3-ultra-550b-a55b";
const FAST = process.env.NIM_MODEL_FAST || "nvidia/nemotron-3.5-lightning-30b-a3b";

// Reasoning models spend tokens thinking before they answer. Keep thinking short (Mistral) or off
// (Nemotron) and leave headroom so the visible answer is never cut off.
function reasoningOpts(model: string, maxTokens: number): Record<string, unknown> {
  if (/mistral-large-4/i.test(model)) return { reasoning_effort: "low", max_tokens: maxTokens + 1500 };
  if (/nemotron-3/i.test(model)) return { chat_template_kwargs: { enable_thinking: false } };
  return {};
}

let client: OpenAI | null | undefined;
function ai(): OpenAI | null {
  if (client === undefined) {
    const key = process.env.NIM_API_KEY;
    client = key ? new OpenAI({ apiKey: key, baseURL: process.env.NIM_BASE_URL || "https://integrate.api.nvidia.com/v1", timeout: 60000, maxRetries: 1 }) : null;
  }
  return client;
}
export const llmEnabled = () => !!ai();
export const modelNames = () => ({ smart: SMART, fast: FAST });

async function chat(model: string, system: string, user: string, maxTokens = 1500): Promise<string> {
  const c = ai();
  if (!c) throw new Error("LLM not configured");
  const body = { model, temperature: 0.1, max_tokens: maxTokens, messages: [{ role: "system" as const, content: system }, { role: "user" as const, content: user }], ...reasoningOpts(model, maxTokens) };
  const r = await c.chat.completions.create(body as Parameters<typeof c.chat.completions.create>[0] & { stream?: false });
  return r.choices[0]?.message?.content?.trim() ?? "";
}

function firstJson<T>(s: string): T | null {
  const start = s.search(/[[{]/);
  if (start < 0) return null;
  for (let end = s.length; end > start; end--) {
    try { return JSON.parse(s.slice(start, end)) as T; } catch { /* keep shrinking */ }
  }
  return null;
}

// ------------------------------------------------------------ extraction fallback
/** Used only when the deterministic parser does not recognise a layout. The balance-chain check validates the result. */
export async function extractStatementLLM(lines: string[]): Promise<Txn[] | null> {
  // The AI only reads: it copies each row's cells as printed, in compact arrays, in small chunks read in
  // parallel. Whether an amount is money in or out is then decided by the balance chain, not by the AI.
  const SIZE = 50;
  const starts = Array.from({ length: Math.ceil(lines.length / SIZE) }, (_, k) => k * SIZE);
  type Cells = [string, string, string, string, string];
  const chunks = await Promise.all(starts.map(async (i) => {
    const chunk = lines.slice(i, i + SIZE).join("\n");
    const res = await chat(FAST, "You copy bank statement rows into JSON. Copy every value exactly as printed. Never calculate, round or guess.",
      `Text below keeps the column spacing of the statement. Return only a JSON array with one array per transaction row:\n["date as YYYY-MM-DD", "description", "amount as printed", "out" or "in" (which column the amount sits in), "balance as printed"]\nSkip header, opening balance and total lines. No other text.\n\n${chunk}`, 4000).catch(() => "");
    const rows = firstJson<Cells[]>(res) ?? [];
    return rows.filter((r) => Array.isArray(r) && /^\d{4}-\d{2}-\d{2}$/.test(String(r[0])) && /\d/.test(String(r[4]))).map((r) => ({ r, page: 1 + Math.floor(i / 45) }));
  }));
  let rows = chunks.flat();
  if (rows.length > 1 && rows[0].r[0] > rows.at(-1)!.r[0]) rows = rows.reverse();
  const num = (s: unknown) => Math.abs(Number(String(s).replace(/[^\d.-]/g, "")) || 0);
  const out: Txn[] = [];
  let prev: number | undefined;
  for (const { r, page } of rows) {
    const amount = num(r[2]), balance = num(r[4]);
    // Direction from arithmetic when the balance settles it; the column hint only when it cannot (e.g. an edited row).
    const isIn = prev !== undefined && Math.abs(prev + amount - balance) < 1 ? true
      : prev !== undefined && Math.abs(prev - amount - balance) < 1 ? false
      : /in|cr/i.test(String(r[3]));
    out.push({ id: `R${out.length + 1}`, date: String(r[0]), narration: String(r[1] ?? ""), ref: "", debit: isIn ? 0 : amount, credit: isIn ? amount : 0, balance, page });
    prev = balance;
  }
  return out.length ? out : null;
}

const CATS: Category[] = ["sales_digital", "sales_cash", "loan_in", "reversal", "interest", "other_in", "emi", "bounce", "supplier", "rent", "salary", "utility", "tax", "drawings", "cash_out", "other_out"];
export async function categoriseLLM(items: { narration: string; dir: "credit" | "debit" }[]): Promise<Record<string, Category>> {
  if (!items.length || !ai()) return {};
  const list = items.slice(0, 80).map((x, i) => `${i}. [${x.dir}] ${x.narration}`).join("\n");
  const res = await chat(FAST, "You label Indian bank statement narrations for a small-business credit analyst.", `Allowed labels: ${CATS.join(", ")}.\nReturn JSON object mapping the line number to a label.\n\n${list}`, 1500).catch(() => "");
  const map = firstJson<Record<string, string>>(res) ?? {};
  const out: Record<string, Category> = {};
  for (const [k, v] of Object.entries(map)) { const it = items[+k]; if (it && CATS.includes(v as Category)) out[it.narration] = v as Category; }
  return out;
}

// ------------------------------------------------------------ facts + verification
export function facts(r: Report) {
  const m = r.metrics, e = r.eligibility;
  return {
    business: { name: r.profile.businessName, city: r.profile.city, vintageYears: r.profile.vintageYears, requested: r.profile.loanRequested, tenureMonths: r.profile.tenureMonths, purpose: r.profile.purpose },
    period: `${r.statement.header.periodFrom} to ${r.statement.header.periodTo}`,
    decision: r.decision,
    eligibility: { eligible: e.eligible, binding: e.binding, monthlyInflow: Math.round(e.monthlyInflow), verifiedMonthlyTurnover: Math.round(e.verifiedTurnover), monthlySurplus: Math.round(e.surplus), maxTotalEmi: Math.round(e.maxTotalEmi), existingEmi: Math.round(e.existingEmi), newEmiRoom: Math.round(e.emiRoom), bounceFactor: e.bounceFactor, turnoverCap: Math.round(e.turnoverCap), emiOnOffer: Math.round(e.emiOnEligible) },
    metrics: { avgMonthlyCredits: Math.round(m.avgCredits), avgDigitalSales: Math.round(m.avgDigital), avgCashSales: Math.round(m.avgCash), cashSharePct: Math.round(m.cashShare * 100), avgMonthlyOpex: Math.round(m.avgOpex), averageBankBalance: Math.round(m.abb), dscr: m.dscr && +m.dscr.toFixed(2), roundTripTotal: m.roundTripTotal, windowDressingTotal: m.windowDressTotal, gstAnnualised: m.gstAnnualised && Math.round(m.gstAnnualised), itrTurnover: r.itr?.grossTurnover },
    loans: m.loans.map((l) => ({ lender: l.lender, emi: l.emi, evidence: l.rowIds.slice(-2) })),
    flags: r.flags.map((f) => ({ severity: f.severity, title: f.title, detail: f.detail, amount: f.amount, evidence: f.evidence.slice(0, 6).map(tag) })),
    strengths: r.strengths,
    pathToYes: { baseline: r.path.baseline, reachable: r.path.reachable, reachesAmount: r.path.combined, steps: r.path.steps.map((s) => ({ action: s.lever, detail: s.detail, adds: s.gain })) },
  };
}
const tag = (e: Report["flags"][number]["evidence"][number]) => (e.kind === "row" ? e.id : e.kind === "gst" ? `GST ${e.month}` : e.kind === "itr" ? "ITR" : "PDF-META");

function factNumbers(r: Report): number[] {
  const nums: number[] = [];
  const walk = (v: unknown) => { if (typeof v === "number" && Math.abs(v) >= 1000) nums.push(Math.abs(v)); else if (v && typeof v === "object") Object.values(v).forEach(walk); };
  walk(facts(r));
  r.txns.forEach((t) => { if (t.debit) nums.push(t.debit); if (t.credit) nums.push(t.credit); nums.push(t.balance); });
  r.monthly.forEach((m) => walk(m));
  if (r.gst) r.gst.forEach((g) => nums.push(g.taxableTurnover, g.taxPaid));
  // flag details contain their own computed figures (e.g. sums over overlapping months)
  r.flags.forEach((f) => (f.title + " " + f.detail).match(/₹[\d,.]+(?:\s?(?:L|Cr|lakh|crore))?/gi)?.forEach((s) => { const n = toRupees(s); if (n) nums.push(n); }));
  return nums;
}

function toRupees(s: string): number | null {
  const m = /₹\s?([\d,]+(?:\.\d+)?)\s?(L|lakh|lakhs|Cr|crore|k)?/i.exec(s);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, ""));
  const u = (m[2] || "").toLowerCase();
  return u.startsWith("l") ? n * 1e5 : u.startsWith("c") ? n * 1e7 : u === "k" ? n * 1e3 : n;
}

export interface Verified { text: string; citations: { tag: string; valid: boolean }[]; figures: { text: string; verified: boolean }[]; source: "llm" | "template"; model?: string }

export function verify(text: string, r: Report, source: Verified["source"], model?: string): Verified {
  const ids = new Set(r.txns.map((t) => t.id));
  const months = new Set((r.gst ?? []).map((g) => g.month));
  const citations = [...text.matchAll(/\[([^\]]+)\]/g)].flatMap((m) => m[1].split(/,\s*/)).map((t) => t.trim()).filter(Boolean).map((t) => ({
    tag: t,
    valid: /^R\d+$/.test(t) ? ids.has(t) : /^GST \d{4}-\d{2}$/.test(t) ? months.has(t.slice(4)) : t === "ITR" ? !!r.itr : t === "PDF-META",
  }));
  const nums = factNumbers(r);
  const figures = (text.match(/₹\s?[\d,]+(?:\.\d+)?\s?(?:L|lakh|lakhs|Cr|crore|k)?\b/gi) ?? []).map((f) => {
    const v = toRupees(f);
    // Exact rupee figures must match to the rupee; rounded lakh/crore figures within their rounding.
    const rounded = /L|lakh|Cr|crore|k/i.test(f);
    return { text: f.trim(), verified: v !== null && (v < 1000 || nums.some((n) => Math.abs(n - v) <= (rounded ? Math.max(1, n * 0.02) : 1))) };
  });
  return { text, citations, figures, source, model };
}

// ------------------------------------------------------------ memo
const MEMO_SYS = `You are a senior credit analyst at an Indian NBFC writing an underwriting memo for a small-business loan.
Rules:
- Use ONLY the facts in the JSON. Never calculate new numbers; copy figures exactly as given (you may write them as ₹X.XL or ₹X,XX,XXX).
- After every claim that comes from evidence, cite it in square brackets using the evidence tags exactly as given, e.g. [R175] or [GST 2026-03] or [ITR] or [PDF-META].
- The ONLY valid tags are row IDs (R followed by digits), one GST month each (GST YYYY-MM), ITR and PDF-META. Never put JSON field or section names in brackets (no [metrics], [eligibility], [pathToYes], [decision]); figures computed by the engine need no tag. Never write a range such as [GST 2025-11 to GST 2026-04]; cite one or two single months instead.
- Plain, direct English a business owner can follow. No hype.
- Sections, each starting with "## ": Summary, Repayment capacity, Risks and red flags, Path to Yes, Recommendation.
- Under 350 words. Use "- " bullets inside sections.`;

export async function writeMemo(r: Report): Promise<Verified> {
  if (!ai()) return verify(templateMemo(r), r, "template");
  try {
    const text = await chat(SMART, MEMO_SYS, JSON.stringify(facts(r)), 1200);
    if (!text) throw new Error("empty");
    return verify(text, r, "llm", SMART);
  } catch (e) {
    console.error("[memo] LLM failed, using template:", (e as Error).message);
    return verify(templateMemo(r), r, "template");
  }
}

export function templateMemo(r: Report): string {
  const e = r.eligibility, m = r.metrics, p = r.profile, d = r.decision;
  const cite = (ev: Report["flags"][number]["evidence"]) => (ev.length ? ` [${ev.slice(0, 4).map(tag).join(", ")}]` : "");
  const L: string[] = [];
  L.push("## Summary");
  L.push(`- ${p.businessName}, ${p.city}, ${p.vintageYears} years in business, asks for ${lakh(p.loanRequested)} over ${p.tenureMonths} months for: ${p.purpose.toLowerCase()}.`);
  L.push(`- Decision: **${d.headline}**.`);
  L.push("## Repayment capacity");
  L.push(`- Genuine sales reaching the bank: ${lakh(e.monthlyInflow)} a month${m.avgCash ? ` (digital ${lakh(m.avgDigital)}, cash ${lakh(m.avgCash)})` : ", all digital"}.`);
  L.push(`- Monthly operating costs ${lakh(m.avgOpex)}, leaving a surplus of ${lakh(e.surplus)} before EMIs.`);
  if (m.avgCash) L.push(`- Verified turnover ${lakh(e.verifiedTurnover)} a month (cash counted at 50% because it cannot be traced), which caps the loan at ${lakh(e.turnoverCap)}.`);
  if (m.loans.length) L.push(`- Existing EMIs ${lakh(e.existingEmi)} a month: ${m.loans.map((l) => `${l.lender} [${l.rowIds.at(-1)}]`).join(", ")}.`);
  L.push(`- Room for a new EMI of ${lakh(e.emiRoom)}; capacity ${lakh(e.eligible)}, limited by ${e.binding}.`);
  L.push("## Risks and red flags");
  if (!r.flags.length) L.push("- No red flags found.");
  r.flags.slice(0, 6).forEach((f) => L.push(`- **${f.title}.** ${f.detail}${cite(f.evidence)}`));
  L.push("## Path to Yes");
  if (d.verdict === "refer") L.push("- Not offered while document integrity is in question. Ask for the statement directly from the bank through the Account Aggregator network.");
  else if (d.verdict === "approve") L.push("- Not needed: the request is within capacity.");
  else {
    r.path.steps.forEach((s) => L.push(`- ${s.lever}: ${s.detail} (adds ${lakh(s.gain)}).`));
    L.push(r.path.reachable ? `- Together these reach ${lakh(r.path.combined)}, covering the ${lakh(p.loanRequested)} requested.` : `- Together these reach ${lakh(r.path.combined)}.`);
  }
  L.push("## Recommendation");
  L.push(`- ${d.headline}${d.amount ? ` at an EMI of about ₹${inr(e.emiOnEligible, 0)} for ${e.tenureMonths} months` : ""}. ${d.reasons[0] ?? ""}.`);
  return L.join("\n");
}

// ------------------------------------------------------------ Q&A
export async function answer(r: Report, question: string): Promise<Verified> {
  const q = question.toLowerCase();
  const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const catWords: Record<string, string[]> = { emi: ["emi"], loan: ["emi"], bounce: ["bounce"], cash: ["sales_cash", "cash_out"], salary: ["salary"], rent: ["rent"], supplier: ["supplier"], gst: ["tax"] };
  const cats = Object.entries(catWords).filter(([k]) => q.includes(k)).flatMap(([, v]) => v);
  const flagged = new Set(r.flags.flatMap((f) => f.evidence.filter((e) => e.kind === "row").map((e) => (e as { id: string }).id)));
  const hits = r.txns.filter((t) => cats.includes(t.cat) || words.some((w) => t.narration.toLowerCase().includes(w)) || (q.includes("flag") || q.includes("fraud") || q.includes("why") ? flagged.has(t.id) : false)).slice(0, 40);
  const rows = hits.map((t) => `${t.id} | ${t.date} | ${t.narration} | dr ${t.debit} | cr ${t.credit} | bal ${t.balance} | ${t.cat}`).join("\n");
  if (!ai()) {
    const f = r.flags.find((f) => words.some((w) => (f.title + f.detail).toLowerCase().includes(w)));
    const text = f ? `${f.title}. ${f.detail} [${f.evidence.slice(0, 4).map(tag).join(", ")}]` : `${r.decision.headline}. ${r.decision.reasons.join(". ")}. (Connect an LLM key for free-form answers.)`;
    return verify(text, r, "template");
  }
  const sys = "You answer a loan officer's question about one underwriting file. Use only the facts and rows given. Never compute new numbers; quote figures exactly. Cite row IDs or tags in square brackets after each claim, e.g. [R12]. If the facts do not answer the question, say so. Under 150 words.";
  const text = await chat(SMART, sys, `FACTS:\n${JSON.stringify(facts(r))}\n\nRELEVANT ROWS:\n${rows || "(none)"}\n\nQUESTION: ${question}`, 600);
  return verify(text, r, "llm", SMART);
}

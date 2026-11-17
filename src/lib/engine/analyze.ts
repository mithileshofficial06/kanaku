// Deterministic underwriting: metrics, red flags, eligibility, decision. No LLM here.
import type { BusinessProfile, GstMonth, ItrSummary, Statement } from "../types";
import { inr, lakh, r2 } from "../format";
import { categorise, OPEX, type Category, type ETxn, hintKey } from "./categorise";
import { POLICY } from "./policy";
import { eligibility, pathToYes, type Eligibility, type EligibilityInput, type Loan, type PathToYes } from "./whatif";

export type Evidence = { kind: "row"; id: string } | { kind: "gst"; month: string } | { kind: "itr"; field: string } | { kind: "meta"; field: string };
export type Severity = "critical" | "high" | "medium" | "low";
export interface Flag { code: string; severity: Severity; title: string; detail: string; evidence: Evidence[]; amount?: number }
export interface MonthStat { month: string; credits: number; debits: number; digital: number; cash: number; opex: number; emi: number; closing: number; abb: number }
export interface FlowNode { key: string; label: string; inflow: number; outflow: number; kind: "customer" | "supplier" | "lender" | "cash" | "linked"; rowIds: string[] }
export type Verdict = "approve" | "approve_reduced" | "decline" | "refer";

export interface Report {
  profile: BusinessProfile;
  statement: { header: Statement["header"]; pages: number; txnCount: number; closing: number; pdfMeta?: Statement["pdfMeta"]; source: "parser" | "llm"; checks?: { chainOk: number; aiLabelled: number; readModel?: string; labelModel?: string } };
  txns: ETxn[];
  monthly: MonthStat[];
  metrics: {
    months: number; avgCredits: number; avgDigital: number; avgCash: number; cashShare: number; avgOpex: number; abb: number;
    loans: Loan[]; totalEmi: number; bounceRowIds: string[]; dscr: number | null;
    roundTripTotal: number; windowDressTotal: number; gstAnnualised?: number; bankAnnualised: number;
  };
  input: EligibilityInput;
  eligibility: Eligibility;
  path: PathToYes;
  decision: { verdict: Verdict; amount: number; headline: string; reasons: string[] };
  flags: Flag[];
  strengths: string[];
  flow: FlowNode[];
  gst?: GstMonth[];
  itr?: ItrSummary;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86400000;
const ym = (d: string) => d.slice(0, 7);
const dayOf = (d: string) => Number(d.slice(8, 10));
const monthLen = (m: string) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
const fmtDate = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const rows = (ids: string[]): Evidence[] => ids.map((id) => ({ kind: "row", id }));

function monthsBetween(a: string, b: string) {
  const out: string[] = [];
  let y = +a.slice(0, 4), m = +a.slice(5, 7);
  while (`${y}-${String(m).padStart(2, "0")}` <= b.slice(0, 7)) { out.push(`${y}-${String(m).padStart(2, "0")}`); m++; if (m > 12) { m = 1; y++; } }
  return out;
}

function roundTrips(tx: ETxn[]) {
  const { minAmount, maxDays, tolerance } = POLICY.roundTrip;
  const used = new Set<string>(), pairs: [ETxn, ETxn][] = [];
  for (const out of tx) {
    if (!out.debit || out.debit < minAmount || !out.cpKey || ["emi", "salary", "rent", "tax"].includes(out.cat)) continue;
    const back = tx.find((c) => c.credit && !used.has(c.id) && c.cpKey === out.cpKey && days(out.date, c.date) >= 0 && days(out.date, c.date) <= maxDays && Math.abs(c.credit - out.debit) / out.debit <= tolerance);
    if (back) { used.add(back.id); used.add(out.id); pairs.push([out, back]); }
  }
  return pairs;
}

function windowDressing(tx: ETxn[]) {
  const { minAmount, lastDays, firstDays, tolerance } = POLICY.windowDressing;
  const used = new Set<string>(), pairs: [ETxn, ETxn][] = [];
  for (const dep of tx) {
    if (dep.cat !== "sales_cash" || dep.credit < minAmount || dayOf(dep.date) <= monthLen(ym(dep.date)) - lastDays) continue;
    const wd = tx.find((w) => w.cat === "cash_out" && !used.has(w.id) && days(dep.date, w.date) > 0 && days(dep.date, w.date) <= lastDays + firstDays && dayOf(w.date) <= firstDays && Math.abs(w.debit - dep.credit) / dep.credit <= tolerance);
    if (wd) { used.add(wd.id); pairs.push([dep, wd]); }
  }
  return pairs;
}

function tamper(st: Statement, tx: ETxn[]): Flag[] {
  const flags: Flag[] = [];
  let prev = st.header.openingBalance;
  const broken: { t: ETxn; expected: number }[] = [];
  for (const t of tx) {
    const expected = r2(prev + t.credit - t.debit);
    if (Math.abs(expected - t.balance) > 0.5) broken.push({ t, expected });
    prev = t.balance;
  }
  if (broken.length) {
    const b = broken[0];
    flags.push({
      code: "tamper_chain", severity: "critical", title: `Balance chain broken on ${broken.length} row${broken.length > 1 ? "s" : ""}`,
      detail: broken.slice(0, 3).map(({ t, expected }) => `${t.id} (${fmtDate(t.date)}): previous balance + deposit - withdrawal = ₹${inr(expected)}, but the statement prints ₹${inr(t.balance)}. A difference of ₹${inr(Math.abs(expected - t.balance))} means an amount was edited after the bank produced it.`).join(" "),
      evidence: rows(broken.map((x) => x.t.id)), amount: Math.abs(b.expected - b.t.balance),
    });
  }
  const fontCount = new Map<string, number>();
  for (const t of tx) for (const f of t.fontNames ?? []) { const font = f.split(":")[1]; fontCount.set(font, (fontCount.get(font) ?? 0) + 1); }
  const main = [...fontCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const odd = tx.filter((t) => (t.fontNames ?? []).some((f) => f.split(":")[1] !== main));
  if (main && odd.length && odd.length < tx.length * 0.05)
    flags.push({ code: "tamper_font", severity: "high", title: `Different font used for amounts on ${odd.length} row${odd.length > 1 ? "s" : ""}`, detail: `Every amount in this statement uses one font except ${odd.map((t) => t.id).join(", ")}. Bank systems print all rows the same way; a different font usually means text was typed over.`, evidence: rows(odd.map((t) => t.id)) });
  const m = st.pdfMeta ?? {};
  const editor = /editor|ilovepdf|smallpdf|sejda|pdfescape|photoshop|word|canva|foxit phantom/i;
  const edited = m.producer && editor.test(`${m.producer} ${m.creator ?? ""}`);
  if (edited)
    flags.push({ code: "tamper_meta", severity: "high", title: "PDF was saved by an editing tool", detail: `The file says it was produced by "${m.producer}", not by a bank system${m.modDate && m.modDate !== m.creationDate ? `, and it was modified after it was created` : ""}.`, evidence: [{ kind: "meta", field: "producer" }] });
  return flags;
}

export function analyze(st: Statement, profile: BusinessProfile, gst?: GstMonth[] | null, itr?: ItrSummary | null, hints?: Record<string, Category>): Report {
  const tx = st.txns.map((t) => categorise(t, hints?.[hintKey(t)]));
  const months = monthsBetween(tx[0].date, tx.at(-1)!.date);
  const rt = roundTrips(tx), wd = windowDressing(tx);
  const rtIds = new Set(rt.flat().map((t) => t.id)), wdIds = new Set(wd.flat().map((t) => t.id));
  const clean = (t: ETxn) => !rtIds.has(t.id) && !wdIds.has(t.id);

  // Monthly stats + average daily balance
  let bal = st.header.openingBalance;
  const monthly: MonthStat[] = months.map((m) => {
    const mt = tx.filter((t) => ym(t.date) === m);
    let daySum = 0;
    for (let d = 1; d <= monthLen(m); d++) {
      const ds = `${m}-${String(d).padStart(2, "0")}`;
      const last = mt.filter((t) => t.date === ds).at(-1);
      if (last) bal = last.balance;
      daySum += bal;
    }
    return {
      month: m, credits: sum(mt.map((t) => t.credit)), debits: sum(mt.map((t) => t.debit)),
      digital: sum(mt.filter((t) => t.cat === "sales_digital" && clean(t)).map((t) => t.credit)),
      cash: sum(mt.filter((t) => t.cat === "sales_cash" && clean(t)).map((t) => t.credit)),
      opex: sum(mt.filter((t) => OPEX.includes(t.cat) && clean(t)).map((t) => (t.cat === "drawings" ? t.debit * POLICY.drawingsWeight : t.debit))),
      emi: sum(mt.filter((t) => t.cat === "emi").map((t) => t.debit)),
      closing: mt.at(-1)?.balance ?? bal, abb: daySum / monthLen(m),
    };
  });

  // Existing loans
  const byLoan = new Map<string, ETxn[]>();
  for (const t of tx.filter((t) => t.cat === "emi")) (byLoan.get(t.loanRef!) ?? byLoan.set(t.loanRef!, []).get(t.loanRef!)!).push(t);
  const loans: Loan[] = [...byLoan.entries()].map(([ref, ts]) => {
    const perMonth = new Map<string, number>();
    ts.forEach((t) => perMonth.set(ym(t.date), (perMonth.get(ym(t.date)) ?? 0) + t.debit));
    return { ref, lender: ref.replace(/\s+\d+$/, ""), emi: median([...perMonth.values()]), rowIds: ts.map((t) => t.id) };
  });
  const bounceRows = tx.filter((t) => t.cat === "bounce");
  const lastIdx = months.length - 1;
  const input: EligibilityInput = {
    avgDigital: mean(monthly.map((m) => m.digital)), avgCash: mean(monthly.map((m) => m.cash)), avgOpex: mean(monthly.map((m) => m.opex)),
    loans, bounceMonths: bounceRows.map((t) => lastIdx - months.indexOf(ym(t.date))),
    requested: profile.loanRequested, tenureMonths: profile.tenureMonths,
  };
  const elig = eligibility(input);
  const path = pathToYes(input);
  const totalEmi = sum(loans.map((l) => l.emi));

  // ---------------- flags
  const flags: Flag[] = [...tamper(st, tx)];
  const avgCredits = mean(monthly.map((m) => m.credits));
  const rtTotal = sum(rt.map(([o]) => o.debit));
  if (rt.length) {
    const parties = [...new Set(rt.map(([o]) => o.cp))];
    flags.push({ code: "round_trip", severity: rtTotal > avgCredits * months.length * 0.1 ? "critical" : "high", title: `Money sent out and returned ${rt.length} times (round-tripping)`, detail: `₹${inr(rtTotal, 0)} went to ${parties.join(" and ")} and came back from the same party within ${POLICY.roundTrip.maxDays} days, almost the same amount each time. This inflates turnover without real sales. These credits are excluded from income.`, evidence: rows(rt.flatMap(([a, b]) => [a.id, b.id])), amount: rtTotal });
  }
  const wdTotal = sum(wd.map(([d]) => d.credit));
  if (wd.length)
    flags.push({ code: "window_dressing", severity: "high", title: `Cash parked at month-end ${wd.length} times`, detail: `Large cash deposits in the last ${POLICY.windowDressing.lastDays} days of a month are withdrawn within the first days of the next. This makes month-end balances look healthier than they are. Excluded from income.`, evidence: rows(wd.flatMap(([a, b]) => [a.id, b.id])), amount: wdTotal });
  const recentBounces = bounceRows.filter((t) => lastIdx - months.indexOf(ym(t.date)) < POLICY.bounceWindowMonths);
  if (bounceRows.length)
    flags.push({ code: "bounces", severity: recentBounces.length >= 2 ? "high" : "medium", title: `${bounceRows.length} EMI bounce${bounceRows.length > 1 ? "s" : ""} (${recentBounces.length} in the last ${POLICY.bounceWindowMonths} months)`, detail: `EMI debits failed for insufficient balance on ${bounceRows.map((t) => fmtDate(t.date)).join(", ")}. Eligibility is multiplied by ${POLICY.bounceFactor(recentBounces.length)}.`, evidence: rows(bounceRows.map((t) => t.id)) });

  let gstAnnualised: number | undefined;
  const bankAnnualised = (input.avgDigital + input.avgCash) * 12;
  if (gst?.length) {
    const overlap = gst.filter((g) => months.includes(g.month));
    gstAnnualised = mean(gst.map((g) => g.taxableTurnover)) * 12;
    const gstSum = sum(overlap.map((g) => g.taxableTurnover));
    const bankSum = sum(monthly.filter((m) => overlap.some((g) => g.month === m.month)).map((m) => m.digital + m.cash));
    const ratio = bankSum ? gstSum / bankSum : Infinity;
    if (overlap.length && Math.abs(ratio - 1) > POLICY.gstBankTolerance)
      flags.push({ code: "gst_vs_bank", severity: "high", title: ratio > 1 ? `GST turnover is ${ratio.toFixed(1)}x the sales seen in the bank` : `Bank sales are ${(1 / ratio).toFixed(1)}x the GST turnover`, detail: ratio > 1 ? `GST returns declare ₹${lakh(gstSum)} for ${overlap.length} months, but only ₹${lakh(bankSum)} of genuine sales reached this account. Either sales go to another account or the GST figures are inflated.` : `₹${lakh(bankSum)} of sales reached the bank but GST returns declare only ₹${lakh(gstSum)}. Possible under-reporting of GST.`, evidence: overlap.map((g) => ({ kind: "gst" as const, month: g.month })) });
  }
  if (itr && gstAnnualised) {
    const ratio = gstAnnualised / itr.grossTurnover;
    if (Math.abs(ratio - 1) > POLICY.gstBankTolerance)
      flags.push({ code: "itr_vs_gst", severity: "high", title: `GST and income tax turnover disagree (${ratio.toFixed(1)}x)`, detail: `GST returns imply about ₹${lakh(gstAnnualised)} a year, but the ITR for FY ${itr.financialYear} declares ₹${lakh(itr.grossTurnover)}. The same business cannot have both turnovers.`, evidence: [{ kind: "itr", field: "grossTurnover" }] });
  }
  const custTotals = new Map<string, { v: number; label: string; ids: string[] }>();
  for (const t of tx.filter((t) => t.cat === "sales_digital" && clean(t) && t.cpKey)) { const c = custTotals.get(t.cpKey) ?? { v: 0, label: t.cp, ids: [] }; c.v += t.credit; c.ids.push(t.id); custTotals.set(t.cpKey, c); }
  // Share of ALL digital sales, including aggregator settlements that have no single named customer.
  const digitalTotal = sum(tx.filter((t) => t.cat === "sales_digital" && clean(t)).map((t) => t.credit));
  const top = [...custTotals.values()].sort((a, b) => b.v - a.v)[0];
  if (top && digitalTotal && top.v / digitalTotal > POLICY.concentrationPct)
    flags.push({ code: "concentration", severity: "medium", title: `${Math.round((top.v / digitalTotal) * 100)}% of digital sales come from one customer`, detail: `${top.label} pays most of the business's digital income. Losing this customer would hit repayment capacity.`, evidence: rows(top.ids.slice(0, 20)) });
  const first3 = mean(monthly.slice(0, 3).map((m) => m.digital + m.cash)), last3 = mean(monthly.slice(-3).map((m) => m.digital + m.cash));
  if (first3 && (last3 - first3) / first3 < -0.1)
    flags.push({ code: "declining", severity: "medium", title: `Sales down ${Math.round(((first3 - last3) / first3) * 100)}% over the period`, detail: `Average monthly sales fell from ₹${lakh(first3)} in the first 3 months to ₹${lakh(last3)} in the last 3.`, evidence: [] });
  if (loans.length >= 2)
    flags.push({ code: "multiple_loans", severity: "low", title: `${loans.length} existing loans found in the statement`, detail: `${loans.map((l) => `${l.lender} (₹${inr(l.emi, 0)}/month)`).join(", ")}. Total EMI ₹${inr(totalEmi, 0)} a month.`, evidence: rows(loans.flatMap((l) => l.rowIds.slice(-2))) });
  if (input.avgCash / Math.max(1, input.avgCash + input.avgDigital) > 0.5)
    flags.push({ code: "cash_heavy", severity: "low", title: `${Math.round((input.avgCash / (input.avgCash + input.avgDigital)) * 100)}% of sales are in cash`, detail: `Cash deposits cannot be traced to customers, so only ${POLICY.cashWeight * 100}% of cash is counted as verified income.`, evidence: rows(tx.filter((t) => t.cat === "sales_cash").slice(-6).map((t) => t.id)) });
  const order: Severity[] = ["critical", "high", "medium", "low"];
  flags.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));

  const strengths: string[] = [];
  if (!bounceRows.length) strengths.push("No EMI or cheque bounces in 12 months");
  if (input.avgDigital > input.avgCash * 2) strengths.push(`${Math.round((input.avgDigital / (input.avgDigital + input.avgCash)) * 100)}% of sales are digital and traceable`);
  if (elig.surplus > 0 && totalEmi && elig.surplus / totalEmi >= 2) strengths.push(`Monthly surplus covers existing EMIs ${(elig.surplus / totalEmi).toFixed(1)} times`);
  if (!flags.some((f) => f.code.startsWith("tamper"))) strengths.push("Statement passes all integrity checks");
  if (profile.vintageYears >= 5) strengths.push(`${profile.vintageYears} years in business`);

  // ---------------- decision
  const critical = flags.filter((f) => f.severity === "critical");
  if (critical.length) strengths.length = 0; // nothing reads as a strength in a file that failed integrity checks
  let decision: Report["decision"];
  if (critical.length) decision = { verdict: "refer", amount: 0, headline: "Refer to fraud review", reasons: critical.map((f) => f.title) };
  else if (elig.eligible >= profile.loanRequested) decision = { verdict: "approve", amount: profile.loanRequested, headline: `Approve ${lakh(profile.loanRequested)}`, reasons: [`Eligible for up to ${lakh(elig.eligible)}, above the ${lakh(profile.loanRequested)} requested`] };
  else if (elig.eligible >= 50000) decision = { verdict: "approve_reduced", amount: elig.eligible, headline: `Approve ${lakh(elig.eligible)} (asked ${lakh(profile.loanRequested)})`, reasons: [`Limited by ${elig.binding}`, ...flags.filter((f) => f.severity === "high").map((f) => f.title)] };
  else decision = { verdict: "decline", amount: 0, headline: "Decline for now", reasons: [`Repayment capacity after existing EMIs is too low (${lakh(elig.eligible)})`] };

  // ---------------- money flow
  const nodes = new Map<string, FlowNode>();
  const addNode = (key: string, label: string, kind: FlowNode["kind"], t: ETxn) => { const n = nodes.get(key) ?? { key, label, inflow: 0, outflow: 0, kind, rowIds: [] }; n.inflow += t.credit; n.outflow += t.debit; n.rowIds.push(t.id); nodes.set(key, n); };
  const linked = new Set(rt.map(([o]) => o.cpKey));
  for (const t of tx) {
    if (linked.has(t.cpKey)) addNode(t.cpKey, t.cp, "linked", t);
    else if (t.cat === "sales_cash" || t.cat === "cash_out") addNode("CASH", "Cash", "cash", t);
    else if (t.cat === "emi" || t.cat === "bounce") addNode(t.loanRef!.replace(/\s+\d+$/, ""), t.loanRef!.replace(/\s+\d+$/, ""), "lender", t);
    else if (t.cat === "sales_digital") addNode("CUSTOMERS", "UPI / bank customers", "customer", t);
    else if (t.cat === "supplier" && t.cpKey) addNode(t.cpKey, t.cp, "supplier", t);
  }
  const flow = [...nodes.values()].sort((a, b) => (b.kind === "linked" ? 1 : 0) - (a.kind === "linked" ? 1 : 0) || b.inflow + b.outflow - (a.inflow + a.outflow)).slice(0, 9);

  return {
    profile,
    statement: { header: st.header, pages: Math.max(...tx.map((t) => t.page)), txnCount: tx.length, closing: tx.at(-1)!.balance, pdfMeta: st.pdfMeta, source: "parser" },
    txns: tx, monthly,
    metrics: {
      months: months.length, avgCredits, avgDigital: input.avgDigital, avgCash: input.avgCash, cashShare: input.avgCash / Math.max(1, input.avgCash + input.avgDigital),
      avgOpex: input.avgOpex, abb: mean(monthly.map((m) => m.abb)), loans, totalEmi, bounceRowIds: bounceRows.map((t) => t.id),
      dscr: totalEmi ? elig.surplus / totalEmi : null, roundTripTotal: rtTotal, windowDressTotal: wdTotal, gstAnnualised, bankAnnualised,
    },
    input, eligibility: elig, path, decision, flags, strengths, flow, gst: gst ?? undefined, itr: itr ?? undefined,
  };
}

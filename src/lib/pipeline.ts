// Documents in, report out. Deterministic parser first; LLM only where it is needed.
import type { BusinessProfile } from "./types";
import { assertHasText, chainScore, lines, parseGst, parseItr, parseStatement, readPdf, ReadError } from "./parse/pdf";
import { analyze, type Report } from "./engine/analyze";
import { categorise, hintKey } from "./engine/categorise";
import { categoriseLLM, extractStatementLLM, llmEnabled, modelNames } from "./llm";

export interface Docs { statement: Uint8Array; gst?: Uint8Array; itr?: Uint8Array; profile: BusinessProfile; password?: string }

export async function runPipeline(d: Docs): Promise<Report> {
  const pdf = await readPdf(d.statement, d.password);
  assertHasText(pdf);
  let st = parseStatement(pdf);
  let source: "parser" | "llm" = "parser";
  if (!st) {
    // Layout not recognised: the AI reads the rows, then the balance chain decides whether to trust it.
    if (!llmEnabled()) throw new ReadError("unreadable", "This statement layout is not recognised and AI reading is not configured. Add an NVIDIA NIM key, or try one of the sample formats.");
    // Keep column spacing so the AI can see which column an amount sits in.
    const txt = lines(pdf.items).map((l) => l.reduce((acc, i) => acc.padEnd(Math.round(i.x / 4)) + (acc ? " " : "") + i.str, ""));
    const txns = await extractStatementLLM(txt).catch(() => null);
    if (!txns) throw new ReadError("unreadable", "Kanaku could not find transaction rows in this PDF. Use the statement PDF downloaded from net banking.");
    if (chainScore(txns) < 0.9) throw new ReadError("unreadable", `The AI read ${txns.length} rows, but their balances do not add up, so Kanaku will not use them. Use the statement PDF downloaded from net banking.`);
    const open = Number((/Opening Balance[:\s]*([\d,]+\.\d{2})/i.exec(txt.join(" "))?.[1] ?? "").replace(/,/g, "")) || txns[0].balance - txns[0].credit + txns[0].debit;
    st = { header: { bankName: txt[0] ?? "", accountHolder: "", accountNumber: "", periodFrom: txns[0].date, periodTo: txns.at(-1)!.date, openingBalance: open }, txns, pdfMeta: pdf.meta };
    source = "llm";
  }
  const gst = d.gst ? parseGst(await readPdf(d.gst, d.password)) : null;
  const itr = d.itr ? parseItr(await readPdf(d.itr, d.password)) : null;
  // Ask the LLM to label only narrations the rules could not place.
  // One item per kind of narration (reference numbers removed), biggest money first.
  const kinds = new Map<string, { key: string; narration: string; dir: "credit" | "debit"; total: number }>();
  for (const t of st.txns.map((x) => categorise(x)).filter((x) => x.cat === "other_in" || x.cat === "other_out")) {
    const key = hintKey(t);
    const k = kinds.get(key) ?? kinds.set(key, { key, narration: t.narration, dir: t.credit ? "credit" : "debit", total: 0 }).get(key)!;
    k.total += t.credit || t.debit;
  }
  const hints: Record<string, import("./engine/categorise").Category> = await categoriseLLM([...kinds.values()].sort((a, b) => b.total - a.total)).catch(() => ({}));
  const report = analyze(st, d.profile, gst, itr, hints);
  report.statement.source = source;
  // What the AI did on this file, and how much of the statement reconciles, shown on the report.
  report.statement.checks = {
    chainOk: Math.round(chainScore(st.txns, st.header.openingBalance) * st.txns.length),
    aiLabelled: report.txns.filter((t) => hints[hintKey(t)]).length,
    readModel: source === "llm" ? modelNames().fast : undefined,
    labelModel: Object.keys(hints).length ? modelNames().fast : undefined,
  };
  return report;
}

// Documents in, report out. Deterministic parser first; LLM only where it is needed.
import type { BusinessProfile } from "./types";
import { lines, parseGst, parseItr, parseStatement, readPdf } from "./parse/pdf";
import { analyze, type Report } from "./engine/analyze";
import { categorise } from "./engine/categorise";
import { categoriseLLM, extractStatementLLM } from "./llm";

export interface Docs { statement: Uint8Array; gst?: Uint8Array; itr?: Uint8Array; profile: BusinessProfile }

export async function runPipeline(d: Docs): Promise<Report> {
  const pdf = await readPdf(d.statement);
  let st = parseStatement(pdf);
  let source: "parser" | "llm" = "parser";
  if (!st) {
    const txt = lines(pdf.items).map((l) => l.map((i) => i.str).join("  "));
    const txns = await extractStatementLLM(txt).catch(() => null);
    if (!txns) throw new Error("Could not read this statement. Use a text-based PDF bank statement.");
    const open = Number((/Opening Balance[:\s]*([\d,]+\.\d{2})/i.exec(txt.join(" "))?.[1] ?? "").replace(/,/g, "")) || txns[0].balance - txns[0].credit + txns[0].debit;
    st = { header: { bankName: txt[0] ?? "", accountHolder: "", accountNumber: "", periodFrom: txns[0].date, periodTo: txns.at(-1)!.date, openingBalance: open }, txns, pdfMeta: pdf.meta };
    source = "llm";
  }
  const gst = d.gst ? parseGst(await readPdf(d.gst)) : null;
  const itr = d.itr ? parseItr(await readPdf(d.itr)) : null;
  // Ask the LLM to label only narrations the rules could not place.
  const unknown = [...new Map(st.txns.map((t) => categorise(t)).filter((t) => t.cat === "other_in" || t.cat === "other_out").map((t) => [t.narration, { narration: t.narration, dir: (t.credit ? "credit" : "debit") as "credit" | "debit" }])).values()];
  const hints = await categoriseLLM(unknown).catch(() => ({}));
  const report = analyze(st, d.profile, gst, itr, hints);
  report.statement.source = source;
  return report;
}

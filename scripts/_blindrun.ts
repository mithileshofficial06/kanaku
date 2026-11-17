import { readFileSync } from "node:fs";
import { runPipeline } from "../src/lib/pipeline";
async function main() {
  for (const f of ["clean", "forged"]) {
    const r = await runPipeline({ statement: new Uint8Array(readFileSync(`test-data/blind/annapoorna-${f}.pdf`)), profile: { id: "upload", businessName: "Annapoorna Sweets and Bakery", ownerName: "", city: "Tiruchirappalli", constitution: "", vintageYears: 6, gstin: "", loanRequested: 800000, tenureMonths: 36, purpose: "Second oven", scenario: "healthy", tagline: "" } });
    const by: Record<string, [number, number, number]> = {};
    for (const t of r.txns) { const b = (by[t.cat] ??= [0, 0, 0]); b[0]++; b[1] += t.credit / 12; b[2] += t.debit / 12; }
    console.log(`\n== ${f}: ${r.decision.verdict} ${r.decision.amount} | ${r.decision.headline}`);
    console.log(`eligible ${r.eligibility.eligible} binding ${r.eligibility.binding} surplus ${Math.round(r.eligibility.surplus)} existingEmi ${r.eligibility.existingEmi} room ${Math.round(r.eligibility.emiRoom)} turnoverCap ${Math.round(r.eligibility.turnoverCap)} bounces ${r.eligibility.bounces}`);
    console.log("loans", JSON.stringify(r.metrics.loans.map((l) => [l.lender, l.emi])), "| AI labelled", r.statement.checks?.aiLabelled);
    console.log("cats", Object.entries(by).map(([k, v]) => `${k}:${v[0]} cr${Math.round(v[1])} dr${Math.round(v[2])}`).join("  "));
    console.log("flags", r.flags.map((x) => `${x.severity}:${x.code}`).join(" "));
    if (f === "clean") console.log("other_out:", [...new Set(r.txns.filter((t) => t.cat === "other_out" || t.cat === "other_in").map((t) => t.narration.slice(0, 40)))].slice(0, 8));
  }
}
main();

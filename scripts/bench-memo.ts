// Times the live memo on two samples with the model in NIM_MODEL_SMART.
// NIM_MODEL_SMART=<model> npx tsx --env-file=.env.local scripts/bench-memo.ts
import { demoReports } from "../src/lib/demo";
import { writeMemo, modelNames } from "../src/lib/llm";

async function main() {
  const reports = await demoReports();
  for (const id of ["arun-auto-spares", "sri-lakshmi-traders"]) {
    const t = Date.now();
    const v = await writeMemo(reports[id]);
    const badF = v.figures.filter((x) => !x.verified), badC = v.citations.filter((x) => !x.valid);
    console.log(`${modelNames().smart} | ${id} | ${Date.now() - t}ms | ${v.source} | figs ${v.figures.length} bad ${badF.length} ${badF.map((x) => x.text).join(",")} | cites ${v.citations.length} bad ${badC.length}`);
    if (process.env.SHOW) console.log(v.text); if (badC.length) console.log("BAD CITES:", badC.map((x) => x.tag).join(" | "));
  }
}
main();

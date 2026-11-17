// NIM live check of the Ask panel: npx tsx --env-file=.env.local scripts/bench-ask.ts
import { demoReports } from "../src/lib/demo";
import { answer } from "../src/lib/llm";
async function main() {
  const r = (await demoReports())["sri-lakshmi-traders"];
  const t = Date.now();
  const v = await answer(r, "Why was this file sent to fraud review? Show me the edited row.");
  console.log(`${Date.now() - t}ms ${v.source} badFigs ${v.figures.filter((x) => !x.verified).length} badCites ${v.citations.filter((x) => !x.valid).length}\n${v.text}`);
}
main();

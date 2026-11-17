// The parser must read statements laid out by other banks, not only the layout it was built with.
// Files come from scripts/generate-formats.ts (same rows as Arun Auto Spares, three different layouts).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSamples } from "../samples/build";
import { assertHasText, chainScore, parseStatement, readPdf, ReadError, toIsoDate } from "./pdf";

const truth = buildSamples().find((s) => s.profile.id === "arun-auto-spares")!.statement;
const load = (f: string) => readPdf(new Uint8Array(readFileSync(join(process.cwd(), "public", "samples", "formats", f))));

describe.each(["layout-a.pdf", "layout-b.pdf", "layout-c.pdf"])("%s", (file) => {
  it("reads every row exactly and the balance chain reconciles", async () => {
    const st = parseStatement(await load(file))!;
    expect(st).not.toBeNull();
    expect(st.txns.length).toBe(truth.txns.length);
    st.txns.forEach((t, i) => {
      const g = truth.txns[i];
      expect([t.date, t.debit, t.credit, t.balance, t.narration]).toEqual([g.date, g.debit, g.credit, g.balance, g.narration]);
    });
    expect(st.header.openingBalance).toBe(truth.header.openingBalance);
    expect(chainScore(st.txns, st.header.openingBalance)).toBe(1);
  });
});

it("refuses a scanned statement with a clear reason", async () => {
  const pdf = await load("scanned.pdf");
  expect(() => assertHasText(pdf)).toThrow(ReadError);
});

it("understands common Indian date styles", () => {
  for (const s of ["05/03/2026", "05-03-26", "05.03.2026", "5 Mar 2026", "05-Mar-26", "05 March 2026"]) expect(toIsoDate(s)).toBe("2026-03-05");
  expect(toIsoDate("Balance")).toBeNull();
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildSamples } from "../samples/build";
import { parseGst, parseItr, parseStatement, readPdf } from "./pdf";

const dir = (id: string) => join(process.cwd(), "public", "samples", id);
const load = async (id: string, f: string) => readPdf(new Uint8Array(readFileSync(join(dir(id), f))));

describe.each(buildSamples())("parse $profile.id", (truth) => {
  it("statement rows match the generated ground truth exactly", async () => {
    const st = parseStatement(await load(truth.profile.id, "statement.pdf"))!;
    expect(st).not.toBeNull();
    expect(st.header.openingBalance).toBe(truth.statement.header.openingBalance);
    expect(st.header.accountNumber).toBe(truth.statement.header.accountNumber);
    expect(st.txns.length).toBe(truth.statement.txns.length);
    st.txns.forEach((t, i) => {
      const g = truth.statement.txns[i];
      expect([t.date, t.debit, t.credit, t.balance, t.ref]).toEqual([g.date, g.debit, g.credit, g.balance, g.ref]);
      expect(t.narration).toBe(g.narration.slice(0, 44));
    });
  });

  it("GST and ITR summaries parse", async () => {
    expect(parseGst(await load(truth.profile.id, "gst.pdf"))).toEqual(truth.gst);
    expect(parseItr(await load(truth.profile.id, "itr.pdf"))).toEqual(truth.itr);
  });
});

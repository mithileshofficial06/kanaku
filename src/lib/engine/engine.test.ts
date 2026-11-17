import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../pipeline";
import { templateMemo, verify } from "../llm";
import { buildSamples } from "../samples/build";
import { eligibility, emiFor, principalFor } from "./whatif";

const run = (id: string) => {
  const f = (n: string) => new Uint8Array(readFileSync(`public/samples/${id}/${n}`));
  return runPipeline({ statement: f("statement.pdf"), gst: f("gst.pdf"), itr: f("itr.pdf"), profile: JSON.parse(readFileSync(`public/samples/${id}/profile.json`, "utf8")) });
};
const codes = (r: Awaited<ReturnType<typeof run>>) => r.flags.map((f) => f.code);

describe("emi maths", () => {
  it("principal and emi are inverses", () => {
    expect(principalFor(emiFor(500000, 36), 36)).toBeCloseTo(500000, 2);
    expect(emiFor(100000, 12)).toBeCloseTo(9167.8, 0); // 18% p.a., 12 months
  });
});

describe("healthy: Meenakshi Textiles", async () => {
  const r = await run("meenakshi-textiles");
  it("approves the full request with no flags", () => {
    expect(r.decision.verdict).toBe("approve");
    expect(r.flags).toHaveLength(0);
    expect(r.metrics.loans).toHaveLength(1);
  });
});

describe("stressed: Arun Auto Spares", async () => {
  const r = await run("arun-auto-spares");
  it("offers a reduced amount and finds the bounces and both loans", () => {
    expect(r.decision.verdict).toBe("approve_reduced");
    expect(r.metrics.bounceRowIds).toHaveLength(3);
    expect(r.metrics.loans.map((l) => l.emi).sort((a, b) => a - b)).toEqual([8000, 14200]);
    expect(codes(r)).toContain("bounces");
    expect(codes(r).some((c) => c.startsWith("tamper"))).toBe(false);
  });
  it("Path to Yes reaches the request without closing the term loan", () => {
    expect(r.path.reachable).toBe(true);
    expect(r.path.combinedLevers.closedLoans.every((x) => x.includes("GOLD"))).toBe(true);
  });
  it("sliders use the same maths as the report", () => {
    expect(eligibility(r.input).eligible).toBe(r.eligibility.eligible);
  });
});

describe("fraud: Sri Lakshmi Traders", async () => {
  const r = await run("sri-lakshmi-traders");
  const truth = buildSamples()[2];
  it("refers to fraud review", () => expect(r.decision.verdict).toBe("refer"));
  it("pinpoints exactly the tampered row", () => {
    const chain = r.flags.find((f) => f.code === "tamper_chain")!;
    expect(chain.evidence).toEqual([{ kind: "row", id: truth.tampered[0].id }]);
    expect(chain.amount).toBe(45000);
    expect(r.flags.find((f) => f.code === "tamper_font")!.evidence).toEqual([{ kind: "row", id: truth.tampered[0].id }]);
  });
  it("catches every planted pattern", () => {
    for (const c of ["tamper_meta", "round_trip", "window_dressing", "gst_vs_bank", "itr_vs_gst"]) expect(codes(r)).toContain(c);
    expect(r.flags.find((f) => f.code === "round_trip")!.evidence).toHaveLength(24);
  });
});

describe("memo verification", async () => {
  const reports = await Promise.all(["meenakshi-textiles", "arun-auto-spares", "sri-lakshmi-traders"].map(run));
  it("template memo cites only real evidence and verifiable figures", () => {
    for (const r of reports) {
      const v = verify(templateMemo(r), r, "template");
      expect(v.citations.filter((c) => !c.valid)).toEqual([]);
      expect(v.figures.filter((f) => !f.verified)).toEqual([]);
    }
  });
  it("flags invented numbers and citations", () => {
    const v = verify("Revenue is ₹7,77,777 a month [R99999].", reports[0], "llm");
    expect(v.figures[0].verified).toBe(false);
    expect(v.citations[0].valid).toBe(false);
  });
});

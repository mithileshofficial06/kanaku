// Blind regression: a statement from a bank layout and a business the engine was never tuned on
// (scripts/make-realistic-statement.ts). Runs the full pipeline with rules only, no AI.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runPipeline } from "../pipeline";
import type { BusinessProfile } from "../types";

const dir = join(process.cwd(), "test-data", "blind");
const truth = JSON.parse(readFileSync(join(dir, "truth.json"), "utf8")) as { opening: number; rows: { date: string; debit: number; credit: number; balance: number }[]; forgedIndex: number };
const profile: BusinessProfile = {
  id: "upload", businessName: "Annapoorna Sweets and Bakery", ownerName: "", city: "Tiruchirappalli", constitution: "", vintageYears: 6,
  gstin: "", loanRequested: 800000, tenureMonths: 36, purpose: "Second oven", scenario: "healthy", tagline: "",
};
const run = (f: string) => runPipeline({ statement: new Uint8Array(readFileSync(join(dir, f))), profile });

describe("blind statement: unseen layout and business", () => {
  it("reads every row exactly, with the opening balance from the table", async () => {
    const r = await run("annapoorna-clean.pdf");
    expect(r.statement.source).toBe("parser");
    expect(r.statement.header.openingBalance).toBe(truth.opening);
    expect(r.txns.length).toBe(truth.rows.length);
    r.txns.forEach((t, i) => expect([t.date, t.debit, t.credit, t.balance]).toEqual([truth.rows[i].date, truth.rows[i].debit, truth.rows[i].credit, truth.rows[i].balance]));
    expect(r.statement.checks?.chainOk).toBe(truth.rows.length);
  });

  it("underwrites the clean file sensibly", async () => {
    const r = await run("annapoorna-clean.pdf");
    // Settlements and cash deposits are sales, the lender auto-debit is a loan, the returned EMI is one bounce
    expect(r.metrics.avgDigital + r.metrics.avgCash).toBeGreaterThan(600000);
    expect(r.metrics.loans.map((l) => [l.lender, l.emi])).toEqual([["CHOLAMANDALAM FINANCE", 21640]]);
    expect(r.eligibility.bounces).toBe(1);
    expect(["approve", "approve_reduced"]).toContain(r.decision.verdict);
    expect(r.decision.amount).toBeGreaterThan(0);
    const codes = r.flags.map((f) => f.code);
    expect(codes).not.toContain("concentration");
    expect(r.flags.filter((f) => f.severity === "critical")).toEqual([]);
  });

  it("refers the forged copy with all three tamper signals on the edited row", async () => {
    const r = await run("annapoorna-forged.pdf");
    expect(r.decision.verdict).toBe("refer");
    const codes = r.flags.map((f) => f.code);
    expect(codes).toEqual(expect.arrayContaining(["tamper_chain", "tamper_font", "tamper_meta"]));
    const chain = r.flags.find((f) => f.code === "tamper_chain")!;
    expect(chain.evidence).toContainEqual({ kind: "row", id: `R${truth.forgedIndex + 1}` });
  });
});

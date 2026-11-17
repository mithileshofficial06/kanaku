// Eligibility maths and the Path to Yes. Pure functions, so the UI sliders run the same code.
import { POLICY } from "./policy";

export interface Loan { ref: string; lender: string; emi: number; rowIds: string[] }

export interface EligibilityInput {
  avgDigital: number; // avg monthly verified digital sales
  avgCash: number; // avg monthly cash deposits (genuine, excl. window dressing)
  avgOpex: number; // avg monthly operating outflow
  loans: Loan[];
  bounceMonths: number[]; // month offsets from statement end (0 = last month) for each bounce
  requested: number;
  tenureMonths: number;
}

export interface Levers {
  cashToDigitalPct: number; // 0..100: share of cash sales moved to UPI/bank
  closedLoans: string[]; // loan refs closed
  cleanMonths: number; // future months with zero bounces (0..6)
  tenureMonths: number;
}

export interface Eligibility {
  monthlyInflow: number; // all genuine sales reaching the bank
  verifiedTurnover: number; // digital + discounted cash, used for the turnover cap
  surplus: number;
  maxTotalEmi: number;
  existingEmi: number;
  emiRoom: number;
  bounces: number;
  bounceFactor: number;
  cashflowAmount: number;
  turnoverCap: number;
  eligible: number;
  binding: "cash flow" | "turnover cap";
  emiOnEligible: number;
  tenureMonths: number;
}

const mr = () => POLICY.annualRate / 12;
export function emiFor(principal: number, months: number) {
  const r = mr(), f = (1 + r) ** months;
  return principal <= 0 ? 0 : (principal * r * f) / (f - 1);
}
export function principalFor(emi: number, months: number) {
  const r = mr(), f = (1 + r) ** months;
  return emi <= 0 ? 0 : (emi * (f - 1)) / (r * f);
}
const roundDown = (n: number) => Math.max(0, Math.floor(n / POLICY.roundTo) * POLICY.roundTo);

export function defaultLevers(inp: EligibilityInput): Levers {
  return { cashToDigitalPct: 0, closedLoans: [], cleanMonths: 0, tenureMonths: inp.tenureMonths };
}

export function eligibility(inp: EligibilityInput, lv: Levers = defaultLevers(inp)): Eligibility {
  const moved = inp.avgCash * (lv.cashToDigitalPct / 100);
  const monthlyInflow = inp.avgDigital + inp.avgCash;
  const verifiedTurnover = inp.avgDigital + moved + (inp.avgCash - moved) * POLICY.cashWeight;
  const surplus = monthlyInflow - inp.avgOpex;
  const maxTotalEmi = Math.max(0, surplus / POLICY.minDscr);
  const existingEmi = inp.loans.filter((l) => !lv.closedLoans.includes(l.ref)).reduce((a, l) => a + l.emi, 0);
  const emiRoom = Math.max(0, maxTotalEmi - existingEmi);
  // Clean months push old bounces out of the look-back window.
  const bounces = inp.bounceMonths.filter((m) => m + lv.cleanMonths < POLICY.bounceWindowMonths).length;
  const bounceFactor = POLICY.bounceFactor(bounces);
  const cashflowAmount = principalFor(emiRoom, lv.tenureMonths) * bounceFactor;
  const turnoverCap = verifiedTurnover * 12 * POLICY.turnoverCapPct;
  const eligible = roundDown(Math.min(cashflowAmount, turnoverCap));
  return {
    monthlyInflow, verifiedTurnover, surplus, maxTotalEmi, existingEmi, emiRoom, bounces, bounceFactor, cashflowAmount, turnoverCap, eligible,
    binding: cashflowAmount <= turnoverCap ? "cash flow" : "turnover cap",
    emiOnEligible: emiFor(Math.min(eligible, inp.requested), lv.tenureMonths),
    tenureMonths: lv.tenureMonths,
  };
}

export interface PathStep { lever: string; detail: string; gain: number; levers: Partial<Levers> }
export interface PathToYes { baseline: number; requested: number; steps: PathStep[]; combined: number; combinedLevers: Levers; reachable: boolean }

/** Greedy plan: apply the realistic lever that adds the most, repeat until the request is met. */
export function pathToYes(inp: EligibilityInput): PathToYes {
  const base = defaultLevers(inp);
  const baseline = eligibility(inp, base).eligible;
  const candidates: { lever: string; detail: string; apply: (l: Levers) => Levers }[] = [];
  if (inp.avgCash > 0)
    candidates.push({ lever: "Take cash sales digitally", detail: `Route half of your cash sales (about ₹${Math.round(inp.avgCash / 2 / 1000)}k a month) through UPI or bank so lenders can verify them`, apply: (l) => ({ ...l, cashToDigitalPct: 50 }) });
  if (inp.bounceMonths.some((m) => m < POLICY.bounceWindowMonths))
    candidates.push({ lever: "Six bounce-free months", detail: "Keep enough balance before every EMI date for the next 6 months; old bounces drop out of the review window", apply: (l) => ({ ...l, cleanMonths: 6 }) });
  // Only the smallest loan is a realistic pre-closure (e.g. a gold loan); big term loans are not.
  const smallest = inp.loans.length > 1 ? [...inp.loans].sort((a, b) => a.emi - b.emi)[0] : null;
  if (smallest)
    candidates.push({ lever: `Close the ${smallest.lender.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}`, detail: `Pre-close your smallest loan (EMI ₹${Math.round(smallest.emi).toLocaleString("en-IN")}/month) to free repayment capacity`, apply: (l) => ({ ...l, closedLoans: [...l.closedLoans, smallest.ref] }) });
  if (inp.tenureMonths < 60)
    candidates.push({ lever: "Longer tenure", detail: `Take ${Math.min(60, inp.tenureMonths + 24)} months instead of ${inp.tenureMonths}, so each EMI is smaller`, apply: (l) => ({ ...l, tenureMonths: Math.min(60, inp.tenureMonths + 24) }) });

  let cur = base, curAmt = baseline;
  const steps: PathStep[] = [];
  const left = [...candidates];
  while (curAmt < inp.requested && left.length) {
    let best = -1, bestAmt = curAmt;
    left.forEach((c, i) => { const a = eligibility(inp, c.apply(cur)).eligible; if (a > bestAmt) { best = i; bestAmt = a; } });
    if (best < 0) break;
    const c = left.splice(best, 1)[0];
    const next = c.apply(cur);
    steps.push({ lever: c.lever, detail: c.detail, gain: bestAmt - curAmt, levers: next });
    cur = next; curAmt = bestAmt;
  }
  return { baseline, requested: inp.requested, steps, combined: curAmt, combinedLevers: cur, reachable: curAmt >= inp.requested };
}

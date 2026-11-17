// Underwriting policy. Every assumption the engine makes lives here and is shown in the UI.
export const POLICY = {
  /** Share of cash deposits counted as verified turnover for the turnover cap (cash cannot be traced to customers). */
  cashWeight: 0.5,
  /** Minimum debt-service coverage: monthly surplus must cover all EMIs this many times. */
  minDscr: 1.25,
  /** Assumed annual interest rate for an unsecured MSME term loan. */
  annualRate: 0.18,
  /** Loan capped at this share of verified annual turnover (Nayak Committee 20% heuristic). */
  turnoverCapPct: 0.2,
  /** Look-back window for bounce penalties, in months. */
  bounceWindowMonths: 6,
  /** Eligibility multiplier by number of bounces in the window. */
  bounceFactor: (n: number) => (n === 0 ? 1 : n === 1 ? 0.9 : n <= 3 ? 0.75 : 0.5),
  roundTrip: { minAmount: 50000, maxDays: 7, tolerance: 0.05 },
  windowDressing: { minAmount: 50000, lastDays: 3, firstDays: 5, tolerance: 0.1 },
  concentrationPct: 0.4,
  gstBankTolerance: 0.3,
  roundTo: 5000,
};

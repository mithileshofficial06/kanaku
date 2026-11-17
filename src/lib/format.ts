/** Indian digit grouping: 1234567.5 -> "12,34,567.50" */
export function inr(n: number, decimals = 2): string {
  const neg = n < 0;
  const [int, frac] = Math.abs(n).toFixed(decimals).split(".");
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3;
  return (neg ? "-" : "") + grouped + (decimals ? "." + frac : "");
}

/** Parse "12,34,567.50" (or "-1,000.00") back to a number. */
export function parseInr(s: string): number {
  const t = s.replace(/[,\s₹]/g, "").replace(/(Cr|Dr)$/i, "");
  if (!t) return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

/** Compact rupee label: 450000 -> "₹4.5L", 12500000 -> "₹1.25Cr" */
export function lakh(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${+(n / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `₹${+(n / 1e5).toFixed(2)}L`;
  return `₹${inr(n, 0)}`;
}

/** Round to paise to avoid floating drift in balance chains. */
export const r2 = (n: number) => Math.round(n * 100) / 100;

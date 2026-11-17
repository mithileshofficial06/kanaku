// Deterministic synthetic data for the three demo businesses.
// Everything here is fictional: bank, lenders, people and numbers.
import type { BusinessProfile, GstMonth, ItrSummary, Statement, Txn } from "../types";
import { r2 } from "../format";

export const BANK_NAME = "Arthavya Bank Ltd (Synthetic)";
const START = new Date(Date.UTC(2025, 10, 1)); // 1 Nov 2025
const MONTHS = 12;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["RAMESH K", "PRIYA S", "KARTHIK M", "LAKSHMI R", "ARJUN V", "DIVYA N", "SURESH P", "ANITHA G", "VIGNESH T", "MEENA J", "GANESH B", "KAVYA D", "MANI A", "REVATHI L", "SELVAM C", "NANDHINI H"];
const HANDLES = ["okaxis", "oksbi", "ybl", "paytm", "okicici", "ibl"];

interface Ev { day: Date; narration: string; ref: string; debit: number; credit: number; order: number }

class Book {
  evs: Ev[] = [];
  private n = 0;
  constructor(private r: () => number) {}
  int(a: number, b: number) { return Math.floor(a + this.r() * (b - a + 1)); }
  amt(a: number, b: number, step = 1) { return Math.round((a + this.r() * (b - a)) / step) * step; }
  pick<T>(xs: T[]) { return xs[Math.floor(this.r() * xs.length)]; }
  ref() { return String(this.int(100000000, 999999999)) + this.int(100, 999); }
  add(day: Date, narration: string, debit: number, credit: number, ref = this.ref()) {
    this.evs.push({ day, narration, ref, debit: r2(debit), credit: r2(credit), order: this.n++ });
  }
  upiIn(day: Date, a: number, b: number) {
    const name = this.pick(FIRST);
    this.add(day, `UPI/CR/${this.ref()}/${name}/${this.pick(HANDLES)}`, 0, this.amt(a, b, 10));
  }
}

const d = (m: number, day: number) => {
  const x = new Date(START);
  x.setUTCMonth(START.getUTCMonth() + m);
  const last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
  x.setUTCDate(Math.min(day, last));
  return x;
};
const lastDay = (m: number) => d(m, 31).getUTCDate();
const iso = (x: Date) => x.toISOString().slice(0, 10);
const ym = (m: number) => iso(d(m, 1)).slice(0, 7);

function finish(b: Book, opening: number): Txn[] {
  const evs = [...b.evs].sort((x, y) => +x.day - +y.day || x.order - y.order);
  let bal = opening;
  return evs.map((e, i) => {
    bal = r2(bal - e.debit + e.credit);
    return { id: `R${i + 1}`, date: iso(e.day), narration: e.narration, ref: e.ref, debit: e.debit, credit: e.credit, balance: bal, page: 0 };
  });
}

export interface SampleBusiness {
  profile: BusinessProfile;
  statement: Statement;
  gst: GstMonth[];
  itr: ItrSummary;
  /** Rows deliberately altered after balances were computed (fraud scenario only). */
  tampered: { id: string; field: "credit" | "debit"; original: number; edited: number }[];
}

function header(holder: string, acct: string, opening: number) {
  return { bankName: BANK_NAME, accountHolder: holder, accountNumber: acct, periodFrom: iso(START), periodTo: iso(d(MONTHS - 1, 31)), openingBalance: opening };
}

/** Sum of business sales credits per month, used to derive GST figures. */
function salesByMonth(txns: Txn[], isSale: (t: Txn) => boolean) {
  const m = new Map<string, number>();
  for (const t of txns) if (t.credit && isSale(t)) m.set(t.date.slice(0, 7), (m.get(t.date.slice(0, 7)) ?? 0) + t.credit);
  return m;
}

// ---------------------------------------------------------------- healthy
function healthy(): SampleBusiness {
  const b = new Book(rng(11));
  const opening = 320000;
  for (let m = 0; m < MONTHS; m++) {
    b.add(d(m, 1), `NEFT DR-STAFF SALARY-${d(m, 1).toLocaleString("en", { month: "short", timeZone: "UTC" }).toUpperCase()}`, 45000, 0);
    b.add(d(m, 5), "IMPS DR-SHOP RENT-K PALANISAMY", 45000, 0);
    b.add(d(m, 7), "ACH D- VAYU FINANCE LTD-TL EMI 0042", 18500, 0);
    b.add(d(m, 12), "BILLPAY DR-TNPDCL ELECTRICITY", b.amt(6000, 9000, 10), 0);
    b.add(d(m, 20), "GST PMT-CBIC-GSTR3B", 0, 0); // placeholder, replaced below
    b.add(d(m, 25), "SELF TRANSFER-OWNER DRAWINGS", 30000, 0);
    for (let k = 0; k < 20; k++) b.upiIn(d(m, b.int(1, lastDay(m))), 8000, 25000);
    for (let k = 0; k < 3; k++) b.add(d(m, b.int(2, 27)), `NEFT CR-${b.pick(["KAVERI SILKS PVT LTD", "ANNAI GARMENTS", "SRI MURUGAN FABRICS"])}-INV`, 0, b.amt(40000, 90000, 100));
    for (let k = 0; k < 4; k++) b.add(d(m, b.int(3, 26)), `NEFT DR-${b.pick(["TIRUPUR YARN MILLS", "ERODE HANDLOOM CO-OP", "SALEM DYEING WORKS"])}-PUR`, b.amt(50000, 100000, 100), 0);
  }
  // GST payment ~ 5% of the month's sales; compute from the same month's credits
  const tmp = finish(b, opening);
  const sales = salesByMonth(tmp, (t) => /UPI\/CR|NEFT CR-/.test(t.narration));
  b.evs = b.evs.filter((e) => !(e.narration.startsWith("GST PMT") && e.debit === 0));
  for (let m = 0; m < MONTHS; m++) b.add(d(m, 20), "GST PMT-CBIC-GSTR3B", r2((sales.get(ym(m)) ?? 0) * 0.05 * 0.35), 0);
  const txns = finish(b, opening);
  const gst: GstMonth[] = [...Array(MONTHS)].map((_, m) => {
    const s = salesByMonth(txns, (t) => /UPI\/CR|NEFT CR-/.test(t.narration)).get(ym(m)) ?? 0;
    const turn = Math.round(s * 0.97);
    return { month: ym(m), taxableTurnover: turn, taxPaid: Math.round(turn * 0.05 * 0.35) };
  });
  const annual = gst.reduce((a, g) => a + g.taxableTurnover, 0);
  return {
    profile: { id: "meenakshi-textiles", businessName: "Meenakshi Textiles", ownerName: "R. Meenakshi", city: "Madurai, Tamil Nadu", constitution: "Proprietorship", vintageYears: 9, gstin: "33ABCPM1234K1Z5", loanRequested: 500000, tenureMonths: 24, purpose: "Working capital for festive inventory", scenario: "healthy", tagline: "Steady digital sales, one small loan, clean repayment" },
    statement: { header: header("MEENAKSHI TEXTILES", "XXXXXXXX4821", opening), txns },
    gst,
    itr: { assessmentYear: "2026-27", financialYear: "2025-26", grossTurnover: Math.round(annual * 0.98), netProfit: Math.round(annual * 0.98 * 0.11) },
    tampered: [],
  };
}

// ---------------------------------------------------------------- stressed
function stressed(): SampleBusiness {
  const b = new Book(rng(22));
  const opening = 165000;
  const bounceMonths = new Set([6, 8, 10]);
  for (let m = 0; m < MONTHS; m++) {
    b.add(d(m, 1), "CASH WDL-SELF-STAFF WAGES", 24000, 0);
    b.add(d(m, 4), "NEFT DR-SHOP RENT-GANDHIPURAM", 25000, 0);
    if (bounceMonths.has(m)) {
      b.add(d(m, 7), "ACH RTN CHGS-VAYU FINANCE EMI 0187-INSUFF BAL", 590, 0);
      b.add(d(m, 12), "ACH D- VAYU FINANCE LTD-TL EMI 0187-REPRESENT", 14200, 0);
    } else b.add(d(m, 7), "ACH D- VAYU FINANCE LTD-TL EMI 0187", 14200, 0);
    b.add(d(m, 10), "ACH D- SWARNA GOLD LOAN-EMI 3391", 8000, 0);
    b.add(d(m, 14), "BILLPAY DR-TNPDCL ELECTRICITY", b.amt(3500, 5000, 10), 0);
    const decline = 1 - m * 0.015;
    for (let k = 0; k < 7; k++) b.add(d(m, b.int(2, lastDay(m))), "CASH DEP-SELF-BRANCH 0412", 0, b.amt(15000, 35000, 500) * decline);
    for (let k = 0; k < 10; k++) b.upiIn(d(m, b.int(1, lastDay(m))), 3000, 12000);
    for (let k = 0; k < 3; k++) b.add(d(m, b.int(3, 26)), `NEFT DR-${b.pick(["KOVAI AUTO PARTS DIST", "SRI RANGA BEARINGS", "TVS PARTS AGENCY KOVAI"])}-PUR`, b.amt(40000, 58000, 100), 0);
    b.add(d(m, 20), "GST PMT-CBIC-GSTR3B", b.amt(2500, 4000, 10), 0);
  }
  const txns = finish(b, opening);
  const sales = salesByMonth(txns, (t) => /UPI\/CR|CASH DEP/.test(t.narration));
  const gst: GstMonth[] = [...Array(MONTHS)].map((_, m) => {
    const turn = Math.round((sales.get(ym(m)) ?? 0) * 0.92);
    return { month: ym(m), taxableTurnover: turn, taxPaid: Math.round(turn * 0.18 * 0.08) };
  });
  const annual = gst.reduce((a, g) => a + g.taxableTurnover, 0);
  return {
    profile: { id: "arun-auto-spares", businessName: "Arun Auto Spares", ownerName: "S. Arun Kumar", city: "Coimbatore, Tamil Nadu", constitution: "Proprietorship", vintageYears: 4, gstin: "33DEFPA5678L1Z2", loanRequested: 500000, tenureMonths: 36, purpose: "Stock up on two-wheeler spares", scenario: "stressed", tagline: "Mostly cash sales, two loans, recent EMI bounces" },
    statement: { header: header("ARUN AUTO SPARES", "XXXXXXXX7730", opening), txns },
    gst,
    itr: { assessmentYear: "2026-27", financialYear: "2025-26", grossTurnover: Math.round(annual * 0.95), netProfit: Math.round(annual * 0.95 * 0.08) },
    tampered: [],
  };
}

// ---------------------------------------------------------------- fraud
function fraud(): SampleBusiness {
  const b = new Book(rng(33));
  const opening = 280000;
  for (let m = 0; m < MONTHS; m++) {
    b.add(d(m, 3), "NEFT DR-GODOWN RENT-SEVVAIPETTAI", 30000, 0);
    b.add(d(m, 7), "ACH D- VAYU FINANCE LTD-TL EMI 0311", 22000, 0);
    for (let k = 0; k < 15; k++) b.upiIn(d(m, b.int(1, lastDay(m))), 5000, 15000);
    for (let k = 0; k < 2; k++) b.add(d(m, b.int(4, 24)), `NEFT DR-${b.pick(["SALEM SAGO FACTORY", "OMALUR TAPIOCA MILL"])}-PUR`, b.amt(30000, 45000, 100), 0);
    // round-tripping: money goes to a linked party and returns 2-3 days later
    const out = b.amt(150000, 250000, 1000);
    const day = b.int(5, 18);
    const party = m % 2 ? "VENKAT ENTERPRISES" : "SRI BALAJI AGENCIES";
    b.add(d(m, day), `RTGS DR-${party}-ADV`, out, 0);
    b.add(d(m, day + b.int(2, 3)), `RTGS CR-${party.replace("ENTERPRISES", "ENTPR")}-SETTLEMENT`, 0, out - b.amt(1000, 3000, 100));
    // month-end window dressing: cash in on the last days, out early next month
    const wd = b.amt(80000, 120000, 1000);
    b.add(d(m, lastDay(m) - 1), "CASH DEP-SELF-BRANCH 0233", 0, wd);
    if (m + 1 < MONTHS) b.add(d(m + 1, 2), "CASH WDL-SELF", wd, 0);
    b.add(d(m, 20), "GST PMT-CBIC-GSTR3B", b.amt(9000, 12000, 10), 0);
  }
  const txns = finish(b, opening);
  // Tamper: one UPI credit inflated after the fact; balances left as printed.
  const target = txns.filter((t) => t.narration.startsWith("UPI/CR") && t.date.startsWith(ym(7)))[3];
  const tampered = [{ id: target.id, field: "credit" as const, original: target.credit, edited: target.credit + 45000 }];
  target.credit = tampered[0].edited;
  // GST declares far more than the genuine sales seen in the bank
  const gst: GstMonth[] = [...Array(MONTHS)].map((_, m) => {
    const turn = 900000 + Math.round(rng(100 + m)() * 120000);
    return { month: ym(m), taxableTurnover: turn, taxPaid: Math.round(turn * 0.05 * 0.2) };
  });
  return {
    profile: { id: "sri-lakshmi-traders", businessName: "Sri Lakshmi Traders", ownerName: "K. Venkatesan", city: "Salem, Tamil Nadu", constitution: "Proprietorship", vintageYears: 2, gstin: "33GHIPK9012M1Z8", loanRequested: 1500000, tenureMonths: 36, purpose: "Expansion of sago trading", scenario: "fraud", tagline: "Big turnover on paper, but the money keeps coming back" },
    statement: { header: header("SRI LAKSHMI TRADERS", "XXXXXXXX1095", opening), txns },
    gst,
    itr: { assessmentYear: "2026-27", financialYear: "2025-26", grossTurnover: 2150000, netProfit: 260000 },
    tampered,
  };
}

export function buildSamples(): SampleBusiness[] {
  return [healthy(), stressed(), fraud()];
}

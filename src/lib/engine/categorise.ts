import type { Txn } from "../types";

export type Category =
  | "sales_digital" | "sales_cash" | "loan_in" | "reversal" | "interest" | "other_in"
  | "emi" | "bounce" | "supplier" | "rent" | "salary" | "utility" | "tax" | "drawings" | "cash_out" | "other_out";

export interface ETxn extends Txn {
  cat: Category;
  cp: string; // counterparty as printed
  cpKey: string; // normalised counterparty key ("" if unknown)
  loanRef?: string; // e.g. "VAYU FINANCE 0187"
}

const STOP = new Set(["PVT", "LTD", "LIMITED", "ENTERPRISES", "ENTPR", "ENT", "AGENCIES", "AGENCY", "CO", "AND", "THE", "M/S", "TRADERS"]);

export function cpKey(name: string): string {
  const toks = name.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter((t) => t && !STOP.has(t) && !/^\d+$/.test(t));
  return toks.slice(0, 2).join(" ");
}

// Payment aggregators settle many customers' payments in one credit: they are a channel, not a customer.
// "SETTLEMENT" alone is not enough: a party paying back money also writes it ("RTGS CR-SRI BALAJI-SETTLEMENT").
const AGGREGATOR = /(?:UPI|POS|MERCHANT|PG|CARD|QR)\s*SETT|PAYTM|PHONEPE|BHARATPE|RAZORPAY|PINE ?LABS|CCAVENUE|CASHFREE|MSWIPE|PAYU|BILLDESK|GOOGLE ?PAY|AMAZON ?PAY/;
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;

function counterparty(n: string): string {
  if (AGGREGATOR.test(n)) return "";
  const upi = /^UPI\/(?:CR|DR)\/\d+\/([^/]+)/.exec(n);
  if (upi) return upi[1].trim();
  const p2a = /^IMPS\/P2[AP]\/\d+\/([^/]+)/.exec(n);
  if (p2a) return p2a[1].trim();
  // NEFT DR-SBIN0007721-SRI MURUGAN FLOUR MILLS-N123: skip the IFSC code to reach the name
  const neft = /^(?:NEFT|RTGS|IMPS)\s*(?:CR|DR)?\s*-\s*(.+)$/.exec(n);
  if (neft) return (neft[1].split("-").map((s) => s.trim()).find((s) => s && !IFSC.test(s)) ?? "").trim();
  const ach = /(?:ACH|NACH|ECS)\s*(?:D|DR)?\s*-\s*([A-Z ]+?)(?:-|\s+LTD|$)/.exec(n);
  if (ach) return ach[1].trim();
  return "";
}

const LENDER = /FINANCE|FINSERV|FINCORP|CAPITAL|LOAN|CREDIT|HOUSING|NBFC|LENDING|\bLN\s?\d|\bBANK\b/;
const RULES: [RegExp, Category, "cr" | "dr" | "any"][] = [
  [/RTN|RETURN|BOUNCE|DISHON|INSUFF/, "bounce", "dr"],
  [/\bEMI\b|LOAN.*(?:EMI|INST)/, "emi", "dr"],
  // Auto-debits to a lender are loan repayments even when the word EMI is missing
  [new RegExp(`(?:ACH|NACH|ECS|\\bSI\\b)[^A-Z]*(?:D|DR)?\\b.*(?:${LENDER.source})`), "emi", "dr"],
  [/LOAN DISB|DISBURS/, "loan_in", "cr"],
  // A returned debit coming back is not income
  [/\bREV\b|REVERSAL|REVERSED|REFUND|RTN|RETURN/, "reversal", "cr"],
  [/INT\.?\s?PD|INTEREST/, "interest", "cr"],
  [/CASH DEP|CASH DEPOSIT|BY CASH|CASH CR|CDM|CSH DEP|^CASH\b/, "sales_cash", "cr"],
  [AGGREGATOR, "sales_digital", "cr"],
  [/^UPI|\bUPI\b|^(NEFT|RTGS|IMPS)|BY TRANSFER|BY CLG|CLEARING|CHQ DEP|CHEQUE DEP|INWARD/, "sales_digital", "cr"],
  [/SALARY|WAGES|PAYROLL/, "salary", "dr"],
  [/RENT/, "rent", "dr"],
  [/ELECTRIC|BILLPAY|WATER|TELECOM|BROADBAND|TNEB|TNPDCL|BESCOM|MSEDCL|EB BILL|\bGAS\b|AIRTEL|JIO|BSNL|VODAFONE|RECHARGE/, "utility", "dr"],
  [/GST PMT|CBIC|CBDT|TDS|TAX PAY|INCOME TAX|ADVANCE TAX/, "tax", "dr"],
  [/CASH WDL|ATM WDL|ATM CASH|CASH WITHDRAWAL|\bATW\b|NWD/, "cash_out", "dr"],
  [/DRAWINGS|SELF TRANSFER|SELF TRF|TO SB\b|OWN A\/?C|PERSONAL A\/?C/, "drawings", "dr"],
  [/^(NEFT|RTGS|IMPS)|^UPI|\bUPI\b|^POS\b|PURCHASE|TO TRANSFER|TRF TO/, "supplier", "dr"],
];

/** Narration with reference numbers removed, so repeated transactions of one kind share a key. */
export const narrKey = (n: string) => n.toUpperCase().replace(/[A-Z]*\d[A-Z0-9]*/g, "#").replace(/\s+/g, " ").trim();

export function categorise(t: Txn, llmHint?: Category): ETxn {
  const n = t.narration.toUpperCase();
  const dir = t.credit > 0 ? "cr" : "dr";
  let cat: Category = dir === "cr" ? "other_in" : "other_out";
  for (const [re, c, d] of RULES) if ((d === "any" || d === dir) && re.test(n)) { cat = c; break; }
  if ((cat === "other_in" || cat === "other_out") && llmHint) cat = llmHint;
  const cp = counterparty(n);
  const e: ETxn = { ...t, cat, cp, cpKey: cpKey(cp) };
  if (cat === "emi" || cat === "bounce") {
    const lender = /(?:(?:ACH|NACH|ECS)\s*(?:D-|DR-|RTN CHGS-)\s*)([A-Z ]+?)(?:\s+LTD|-|\s+EMI|\s+RETURN|$)/.exec(n)?.[1]?.trim() || cp;
    const num = /EMI\s*(\d{3,})/.exec(n)?.[1] ?? "";
    e.loanRef = `${lender} ${num}`.trim();
  }
  return e;
}

export const isInflowCat = (c: Category) => ["sales_digital", "sales_cash", "loan_in", "reversal", "interest", "other_in"].includes(c);
export const OPEX: Category[] = ["supplier", "rent", "salary", "utility", "tax", "drawings", "cash_out", "other_out", "bounce"];

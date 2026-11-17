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

function counterparty(n: string): string {
  const upi = /^UPI\/(?:CR|DR)\/\d+\/([^/]+)/.exec(n);
  if (upi) return upi[1].trim();
  const neft = /^(?:NEFT|RTGS|IMPS)\s*(?:CR|DR)-([^-]+)/.exec(n);
  if (neft) return neft[1].trim();
  const ach = /ACH\s*D-\s*([A-Z ]+?)(?:-|\s+LTD|$)/.exec(n);
  if (ach) return ach[1].trim();
  return "";
}

const RULES: [RegExp, Category, "cr" | "dr" | "any"][] = [
  [/RTN|RETURN|BOUNCE|DISHON/, "bounce", "dr"],
  [/\bEMI\b|LOAN.*(?:EMI|INST)/, "emi", "dr"],
  [/LOAN DISB|DISBURS/, "loan_in", "cr"],
  [/\bREV\b|REVERSAL|REFUND/, "reversal", "cr"],
  [/INT\.?\s?PD|INTEREST/, "interest", "cr"],
  [/CASH DEP|CASH DEPOSIT/, "sales_cash", "cr"],
  [/^UPI\/CR|^(NEFT|RTGS|IMPS)\s*CR/, "sales_digital", "cr"],
  [/SALARY|WAGES|PAYROLL/, "salary", "dr"],
  [/RENT/, "rent", "dr"],
  [/ELECTRIC|BILLPAY|WATER|TELECOM|BROADBAND/, "utility", "dr"],
  [/GST PMT|CBIC|CBDT|TDS|TAX/, "tax", "dr"],
  [/DRAWINGS|SELF TRANSFER/, "drawings", "dr"],
  [/CASH WDL|ATM WDL|CASH WITHDRAWAL/, "cash_out", "dr"],
  [/^(NEFT|RTGS|IMPS)\s*DR|^UPI\/DR/, "supplier", "dr"],
];

export function categorise(t: Txn, llmHint?: Category): ETxn {
  const n = t.narration.toUpperCase();
  const dir = t.credit > 0 ? "cr" : "dr";
  let cat: Category = dir === "cr" ? "other_in" : "other_out";
  for (const [re, c, d] of RULES) if ((d === "any" || d === dir) && re.test(n)) { cat = c; break; }
  if ((cat === "other_in" || cat === "other_out") && llmHint) cat = llmHint;
  const cp = counterparty(n);
  const e: ETxn = { ...t, cat, cp, cpKey: cpKey(cp) };
  if (cat === "emi" || cat === "bounce") {
    const lender = /(?:ACH\s*(?:D-|RTN CHGS-)\s*)([A-Z ]+?)(?:\s+LTD|-|\s+EMI)/.exec(n)?.[1]?.trim() ?? cp;
    const num = /EMI\s*(\d{3,})/.exec(n)?.[1] ?? "";
    e.loanRef = `${lender} ${num}`.trim();
  }
  return e;
}

export const isInflowCat = (c: Category) => ["sales_digital", "sales_cash", "loan_in", "reversal", "interest", "other_in"].includes(c);
export const OPEX: Category[] = ["supplier", "rent", "salary", "utility", "tax", "drawings", "cash_out", "other_out", "bounce"];

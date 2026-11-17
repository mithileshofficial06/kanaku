// Shared domain types for Kanaku.

/** One bank statement row. `id` is the citation handle (R1, R2, ...). */
export interface Txn {
  id: string;
  date: string; // YYYY-MM-DD
  narration: string;
  ref: string;
  debit: number; // rupees, 0 if none
  credit: number; // rupees, 0 if none
  balance: number; // closing balance after this row, as printed
  page: number; // 1-indexed PDF page
  y?: number; // baseline y on the page (PDF units), for highlighting
  fontNames?: string[]; // fonts used to draw this row (tamper signal)
}

export interface StatementHeader {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  periodFrom: string;
  periodTo: string;
  openingBalance: number;
}

export interface Statement {
  header: StatementHeader;
  txns: Txn[];
  pdfMeta?: { producer?: string; creator?: string; creationDate?: string; modDate?: string };
}

export interface GstMonth {
  month: string; // YYYY-MM
  taxableTurnover: number;
  taxPaid: number;
}

export interface ItrSummary {
  assessmentYear: string;
  financialYear: string;
  grossTurnover: number;
  netProfit: number;
}

export interface BusinessProfile {
  id: string;
  businessName: string;
  ownerName: string;
  city: string;
  constitution: string;
  vintageYears: number;
  gstin: string;
  loanRequested: number;
  tenureMonths: number;
  purpose: string;
  scenario: "healthy" | "stressed" | "fraud";
  tagline: string;
}

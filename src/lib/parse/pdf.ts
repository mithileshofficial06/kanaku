// Deterministic PDF parsing (no LLM). Works on text-based PDFs; returns null
// when a layout is not recognised so the caller can fall back to the LLM.
import type { GstMonth, ItrSummary, Statement, Txn } from "../types";
import { parseInr, r2 } from "../format";

export interface TextItem { str: string; x: number; xr: number; y: number; page: number; font: string }
export interface PdfText { items: TextItem[]; pages: number; meta: Statement["pdfMeta"] }

/** Errors a user can act on. The message is shown as is. */
export class ReadError extends Error {
  constructor(public code: "password" | "bad_password" | "scanned" | "unreadable", message: string) { super(message); }
}

const AMOUNT = /^-?[\d,]+\.\d{2}$/;

export async function readPdf(data: Uint8Array, password?: string): Promise<PdfText> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: data.slice(), password: password || undefined, disableFontFace: true, useSystemFonts: false, verbosity: 0 });
  let doc;
  try {
    doc = await task.promise;
  } catch (e) {
    await task.destroy().catch(() => {});
    const err = e as { name?: string; code?: number };
    if (err?.name === "PasswordException") {
      throw password
        ? new ReadError("bad_password", "That password did not open the PDF. Check it and try again.")
        : new ReadError("password", "This PDF is password protected. Enter its password (bank e-statements often use part of your name and date of birth) and try again.");
    }
    throw new ReadError("unreadable", "This file could not be opened as a PDF. Download the statement again from net banking and retry.");
  }
  const items: TextItem[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    for (const it of tc.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      const x = it.transform[4], y = it.transform[5];
      items.push({ str: it.str.trim(), x, xr: x + it.width, y: Math.round(y * 10) / 10, page: p, font: it.fontName });
    }
  }
  const md = await doc.getMetadata().catch(() => null);
  const info = (md?.info ?? {}) as Record<string, string>;
  const meta = { producer: info.Producer, creator: info.Creator, creationDate: info.CreationDate, modDate: info.ModDate };
  const pages = doc.numPages;
  await task.destroy();
  return { items, pages, meta };
}

/** A PDF with almost no text is a scan or photo: there is nothing reliable to read. */
export function assertHasText(pdf: PdfText) {
  if (pdf.items.length < 15 * Math.min(pdf.pages, 3)) {
    throw new ReadError("scanned", "This PDF looks like a scanned image, so it has no text Kanaku can verify. Download the e-statement PDF from net banking, or fetch it through the Account Aggregator network.");
  }
}

/** Group items into visual lines (same page, same baseline), sorted top-to-bottom, left-to-right. */
export function lines(items: TextItem[]): TextItem[][] {
  const map = new Map<string, TextItem[]>();
  for (const it of items) {
    const k = `${it.page}:${Math.round(it.y)}`;
    (map.get(k) ?? map.set(k, []).get(k)!).push(it);
  }
  return [...map.values()]
    .map((l) => l.sort((a, b) => a.x - b.x))
    .sort((a, b) => a[0].page - b[0].page || b[0].y - a[0].y);
}

// ------------------------------------------------------------ dates
const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
/** Indian statement date formats: 01/04/2026, 01-04-26, 01.04.2026, 1 Apr 2026, 01-Apr-26, 01 April, 2026. */
export function toIsoDate(raw: string): string | null {
  const s = raw.trim().replace(/,/g, " ").replace(/\s+/g, " ");
  let d: number, m: number, y: string;
  let r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(s);
  if (r) { d = +r[1]; m = +r[2]; y = r[3]; }
  else if ((r = /^(\d{1,2})[\s-]([A-Za-z]{3})[A-Za-z]*[\s-](\d{2}|\d{4})$/.exec(s)) && MONTHS[r[2].toLowerCase()]) { d = +r[1]; m = MONTHS[r[2].toLowerCase()]; y = r[3]; }
  else return null;
  if (y.length === 2) y = "20" + y;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
const isDate = (s: string) => toIsoDate(s) !== null;

// Amounts: 1,23,456.78 with an optional Cr/Dr suffix. Dr/Cr marker cells on their own.
const AMT = /^-?[\d,]+\.\d{2}(?:\s?(?:Cr|Dr|CR|DR)\.?)?$/;
const MARK = /^\(?(Dr|Cr|DR|CR|D|C)\.?\)?$/;
const suffix = (s: string) => (/(Dr|DR)\.?$/.test(s) ? "dr" : /(Cr|CR)\.?$/.test(s) ? "cr" : null);

/** Share of rows whose printed balance equals previous balance + credit - debit (to the rupee). */
export function chainScore(txns: Txn[], opening?: number): number {
  if (!txns.length) return 0;
  let ok = 0, prev = opening;
  for (const t of txns) {
    if (prev === undefined || Math.abs(prev + t.credit - t.debit - t.balance) < 1) ok++;
    prev = t.balance;
  }
  return ok / txns.length;
}

type Field = "debit" | "credit" | "amount" | "balance";

/**
 * Layout-aware statement parser. Finds the table header, maps each column by position, and reads rows.
 * Handles separate debit/credit columns or one amount column with a Dr/Cr marker, wrapped descriptions,
 * value-date columns, newest-first order and many date styles. Returns null when the layout is not
 * recognised or the rows do not reconcile, so the caller can fall back to AI extraction.
 */
export function parseStatement(pdf: PdfText): Statement | null {
  const ls = lines(pdf.items);
  const isHead = (l: TextItem[]) => l.some((i) => /date/i.test(i.str)) && l.some((i) => /balance/i.test(i.str)) && l.some((i) => /narration|description|particulars|details|remarks/i.test(i.str));
  const head = ls.find(isHead);
  if (!head) return null;
  const col = (re: RegExp, not?: RegExp) => head.find((i) => re.test(i.str) && !(not && not.test(i.str)));
  const date = col(/date/i)!;
  const narr = col(/narration|description|particulars|details|remarks/i)!;
  const bal = col(/balance/i)!;
  const ref = col(/ref|chq|cheque/i, /narration|description|particulars|details/i);
  const wd = col(/withdrawal|debit/i, /credit|balance/i), dep = col(/deposit|credit/i, /debit|balance/i);
  const amt = !wd && !dep ? col(/^amount/i) : undefined;
  if (!((wd && dep) || amt)) return null;

  const amountCols: [Field, TextItem][] = [];
  if (wd) amountCols.push(["debit", wd]);
  if (dep) amountCols.push(["credit", dep]);
  if (amt) amountCols.push(["amount", amt]);
  amountCols.push(["balance", bal]);
  const amountStart = Math.min(...amountCols.map(([, h]) => h.x)) - 45;
  const narrEnd = Math.min(ref && ref.x > narr.x ? ref.x : Infinity, amountStart) - 2;
  const nearest = (it: TextItem): Field => {
    const c = (it.x + it.xr) / 2;
    let best: Field = "balance", bestD = Infinity;
    for (const [f, h] of amountCols) {
      const dist = Math.min(Math.abs(it.xr - h.xr), Math.abs(c - (h.x + h.xr) / 2), Math.abs(it.x - h.x));
      if (dist < bestD) { best = f; bestD = dist; }
    }
    return best;
  };

  const all = pdf.items.map((i) => i.str).join("\n");
  const grab = (re: RegExp) => re.exec(all)?.[1]?.trim() ?? "";
  const period = /Period[^\n:]*:\s*([^\n]+?)\s+(?:to|-)\s+([^\n]+)/i.exec(all);
  const opening = parseInr(grab(/(?:Opening Balance|Opening Bal\.?|Balance B\/F|Brought Forward)[^\d\n]*([\d,]+\.\d{2})/i));

  let txns: Txn[] = [];
  let last: { t: Txn; y: number; page: number } | null = null;
  for (const l of ls) {
    if (isHead(l)) { last = null; continue; }
    // The date may be one cell or split over two or three cells.
    let iso: string | null = null, used = 0;
    for (let k = 1; k <= 3 && k <= l.length && !iso; k++) {
      if (l[k - 1].x > narr.x - 2) break;
      iso = toIsoDate(l.slice(0, k).map((i) => i.str).join(" ")); used = k;
    }
    if (!iso || l[0].x > date.x + 30) {
      // Continuation line: a wrapped description directly under the previous row.
      if (last && l[0].page === last.page && last.y - l[0].y < 13 && !l.some((i) => AMT.test(i.str) || /total|closing|opening|page \d/i.test(i.str))) {
        for (const it of l) {
          if (it.x >= narr.x - 4 && it.x < narrEnd) last.t.narration = (last.t.narration + " " + it.str).trim();
          else if (ref && it.x >= narrEnd && it.x < amountStart) last.t.ref = (last.t.ref + it.str).trim();
        }
        last.y = l[0].y;
      }
      continue;
    }
    const t: Txn = { id: "", date: iso, narration: "", ref: "", debit: 0, credit: 0, balance: NaN, page: l[0].page, y: l[0].y, fontNames: [] };
    const narrParts: string[] = [];
    let amount = 0, mark: "dr" | "cr" | null = null;
    for (const it of l.slice(used)) {
      if (AMT.test(it.str) && it.x >= amountStart) {
        const field = nearest(it), v = Math.abs(parseInr(it.str));
        if (field === "balance") t.balance = suffix(it.str) === "dr" ? -v : v;
        else if (field === "amount") { amount = v; mark = suffix(it.str) ?? mark; }
        else t[field] = v;
        t.fontNames!.push(`${field === "amount" ? "credit" : field}:${it.font}`);
      } else if (MARK.test(it.str) && it.x >= amountStart - 5) mark = /^\(?d/i.test(it.str) ? "dr" : "cr";
      else if (isDate(it.str) && (it.x < narr.x - 4 || it.x >= narrEnd)) continue; // value-date column
      else if (it.x >= narrEnd && it.x < amountStart) t.ref = (t.ref + " " + it.str).trim();
      else if (it.x >= narr.x - 4) narrParts.push(it.str);
    }
    if (amt) { if (mark === "dr") t.debit = amount; else t.credit = amount; }
    t.narration = narrParts.join(" ");
    if (Number.isNaN(t.balance)) continue;
    txns.push(t);
    last = { t, y: l[0].y, page: l[0].page };
  }
  if (!txns.length) return null;

  // Newest-first statements: put rows in date order.
  if (txns[0].date > txns.at(-1)!.date) txns = txns.reverse();
  const open = opening || r2(txns[0].balance - txns[0].credit + txns[0].debit);
  // A row that only reconciles with debit and credit swapped was mapped to the wrong column: fix it.
  // Rows that reconcile neither way stay as printed; the tamper check reports them.
  let prev = open;
  for (const t of txns) {
    if (Math.abs(prev + t.credit - t.debit - t.balance) >= 1 && Math.abs(prev + t.debit - t.credit - t.balance) < 1) [t.debit, t.credit] = [t.credit, t.debit];
    prev = t.balance;
  }
  txns.forEach((t, i) => (t.id = `R${i + 1}`));
  // If most rows do not reconcile, the columns were not understood. Let the AI try instead.
  if (chainScore(txns, open) < 0.9) return null;

  const pf = period ? toIsoDate(period[1]) : null, pt = period ? toIsoDate(period[2]) : null;
  return {
    header: {
      bankName: ls[0]?.[0]?.str ?? "",
      accountHolder: grab(/(?:Account Holder|Customer Name|Account Name)\s*:?\s*([^\n]+)/i),
      accountNumber: grab(/(?:Account No\.?|Account Number|A\/c No\.?)\s*:?\s*([^\n]+)/i),
      periodFrom: pf ?? txns[0].date,
      periodTo: pt ?? txns.at(-1)!.date,
      openingBalance: open,
    },
    txns,
    pdfMeta: pdf.meta,
  };
}

export function parseGst(pdf: PdfText): GstMonth[] | null {
  const rows = lines(pdf.items)
    .filter((l) => /^\d{4}-\d{2}$/.test(l[0].str) && l.filter((i) => AMOUNT.test(i.str)).length >= 2)
    .map((l) => { const a = l.filter((i) => AMOUNT.test(i.str)).map((i) => parseInr(i.str)); return { month: l[0].str, taxableTurnover: a[0], taxPaid: a[1] }; });
  return rows.length ? rows : null;
}

export function parseItr(pdf: PdfText): ItrSummary | null {
  const ls = lines(pdf.items);
  const amt = (re: RegExp) => { const l = ls.find((x) => re.test(x[0].str)); const a = l?.find((i) => AMOUNT.test(i.str)); return a ? parseInr(a.str) : NaN; };
  const text = pdf.items.map((i) => i.str).join(" ");
  const ay = /Assessment Year:\s*(\d{4}-\d{2})/.exec(text)?.[1] ?? "";
  const fy = /Financial Year:\s*(\d{4}-\d{2})/.exec(text)?.[1] ?? "";
  const grossTurnover = amt(/turnover|receipts/i), netProfit = amt(/net profit/i);
  if (Number.isNaN(grossTurnover)) return null;
  return { assessmentYear: ay, financialYear: fy, grossTurnover, netProfit };
}

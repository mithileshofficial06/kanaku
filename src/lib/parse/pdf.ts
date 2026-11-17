// Deterministic PDF parsing (no LLM). Works on text-based PDFs; returns null
// when a layout is not recognised so the caller can fall back to the LLM.
import type { GstMonth, ItrSummary, Statement, Txn } from "../types";
import { parseInr } from "../format";

export interface TextItem { str: string; x: number; xr: number; y: number; page: number; font: string }
export interface PdfText { items: TextItem[]; pages: number; meta: Statement["pdfMeta"] }

const AMOUNT = /^-?[\d,]+\.\d{2}$/;
const DATE = /^(\d{2})[/-](\d{2})[/-](\d{4})$/;

export async function readPdf(data: Uint8Array): Promise<PdfText> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({ data: data.slice(), disableFontFace: true, useSystemFonts: false, verbosity: 0 });
  const doc = await task.promise;
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

const toIso = (s: string) => { const m = DATE.exec(s)!; return `${m[3]}-${m[2]}-${m[1]}`; };
const after = (text: string, label: string) => text.split(label)[1]?.trim() ?? "";

export function parseStatement(pdf: PdfText): Statement | null {
  const ls = lines(pdf.items);
  const head = ls.find((l) => l.some((i) => i.str === "Date") && l.some((i) => /Balance/i.test(i.str)));
  if (!head) return null;
  const col = (re: RegExp) => head.find((i) => re.test(i.str));
  const narr = col(/Narration|Description|Particulars/i), ref = col(/Ref|Chq/i);
  const wd = col(/Withdrawal|Debit/i), dep = col(/Deposit|Credit/i), bal = col(/Balance/i);
  if (!narr || !wd || !dep || !bal) return null;
  const rights = [["debit", wd.xr], ["credit", dep.xr], ["balance", bal.xr]] as const;
  const refX = ref?.x ?? wd.x - 60;
  const amountStart = Math.min(wd.x, dep.x) - 40;

  const all = pdf.items.map((i) => i.str).join("\n");
  const grab = (label: string) => after(all.split("\n").find((s) => s.startsWith(label)) ?? "", label);
  const period = grab("Period:").split(" to ");
  const firstLine = ls[0]?.[0]?.str ?? "";

  const txns: Txn[] = [];
  for (const l of ls) {
    if (!DATE.test(l[0].str) || l[0].x > narr.x) continue;
    const t: Txn = { id: `R${txns.length + 1}`, date: toIso(l[0].str), narration: "", ref: "", debit: 0, credit: 0, balance: NaN, page: l[0].page, y: l[0].y, fontNames: [] };
    const narrParts: string[] = [];
    for (const it of l.slice(1)) {
      if (AMOUNT.test(it.str) && it.x >= amountStart) {
        const [field] = rights.reduce((best, c) => (Math.abs(it.xr - c[1]) < Math.abs(it.xr - best[1]) ? c : best));
        t[field] = parseInr(it.str);
        t.fontNames!.push(`${field}:${it.font}`);
      } else if (it.x >= refX - 2 && it.x < amountStart) t.ref = (t.ref + " " + it.str).trim();
      else narrParts.push(it.str);
    }
    t.narration = narrParts.join(" ");
    if (Number.isNaN(t.balance)) continue;
    txns.push(t);
  }
  if (!txns.length) return null;
  return {
    header: {
      bankName: firstLine,
      accountHolder: grab("Account Holder:"),
      accountNumber: grab("Account No:"),
      periodFrom: period[0] && DATE.test(period[0]) ? toIso(period[0]) : txns[0].date,
      periodTo: period[1] && DATE.test(period[1]) ? toIso(period[1]) : txns.at(-1)!.date,
      openingBalance: parseInr(grab("Opening Balance:")) || 0,
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

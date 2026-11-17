// Renders one business's statement in several different bank layouts, plus a scanned (image-only)
// file, so the parser is tested against more than the one layout it was built with.
// Output: public/samples/formats/*.pdf. Bank names are fictional. Run: npm run gen:formats
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { buildSamples } from "../src/lib/samples/build";
import { inr } from "../src/lib/format";
import type { Txn } from "../src/lib/types";

const OUT = join(process.cwd(), "public", "samples", "formats");
const W = 595, H = 842, BOTTOM = 60;
const grey = rgb(0.45, 0.45, 0.45);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const parts = (s: string) => { const [y, m, d] = s.split("-"); return { y, m, d, mon: MON[+m - 1] }; };

/** Word-wrap to at most `n` characters per line. */
export function wrap(s: string, n: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const w of s.split(" ")) {
    if (cur && (cur + " " + w).length > n) { out.push(cur); cur = w; } else cur = cur ? cur + " " + w : w;
  }
  if (cur) out.push(cur);
  return out;
}

interface Col { label: string; x: number; align?: "right" }
interface Layout {
  file: string; bank: string; cols: Col[]; newestFirst?: boolean; size: number;
  info: (h: ReturnType<typeof header>) => string[];
  row: (t: Txn) => (string | string[])[]; // one cell per column; string[] = wrapped lines
}
const header = () => buildSamples().find((s) => s.profile.id === "arun-auto-spares")!.statement.header;

async function render(L: Layout, txns: Txn[]) {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica), fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const h = header();
  const draw = (p: PDFPage, text: string, c: Col, y: number, font: PDFFont, size = L.size) =>
    p.drawText(text, { x: c.align === "right" ? c.x - font.widthOfTextAtSize(text, size) : c.x, y, size, font });
  let page!: PDFPage, y = 0;
  const newPage = (first: boolean) => {
    page = doc.addPage([W, H]);
    page.drawText(L.bank, { x: 36, y: 805, size: 13, font: fb });
    if (first) L.info(h).forEach((t, i) => page.drawText(t, { x: 36, y: 785 - i * 11, size: 8, font: f }));
    y = first ? 720 : 770;
    L.cols.forEach((c) => draw(page, c.label, c, y, fb, 7.5));
    page.drawLine({ start: { x: 36, y: y - 4 }, end: { x: W - 30, y: y - 4 }, thickness: 0.5, color: grey });
    y -= 16;
  };
  newPage(true);
  for (const t of L.newestFirst ? [...txns].reverse() : txns) {
    const cells = L.row(t);
    const height = Math.max(...cells.map((c) => (Array.isArray(c) ? c.length : 1)));
    if (y - (height - 1) * 9 < BOTTOM) newPage(false);
    cells.forEach((c, i) => (Array.isArray(c) ? c : [c]).forEach((line, k) => line && draw(page, line, L.cols[i], y - k * 9, f)));
    y -= 15 + (height - 1) * 9;
  }
  const pages = doc.getPages();
  pages.forEach((p, i) => p.drawText(`Page ${i + 1} of ${pages.length}  |  Synthetic statement for testing. Not issued by any bank.`, { x: 36, y: 30, size: 7, font: f, color: grey }));
  doc.setProducer(`${L.bank} e-Statement Service`);
  return doc.save();
}

const LAYOUTS: Layout[] = [
  {
    // Txn date + value date, long dates, wrapped descriptions, Debit/Credit columns.
    file: "layout-a.pdf", bank: "Kaveri Co-operative Bank (Synthetic)", size: 7,
    cols: [{ label: "Txn Date", x: 36 }, { label: "Value Date", x: 84 }, { label: "Description", x: 132 }, { label: "Ref No./Cheque No.", x: 290 }, { label: "Debit", x: 425, align: "right" }, { label: "Credit", x: 492, align: "right" }, { label: "Balance", x: 565, align: "right" }],
    info: (h) => [`Account Name : ${h.accountHolder}`, `Account Number : ${h.accountNumber}`, `Statement Period : 1 Nov 2025 to 31 Oct 2026`, `Opening Balance : ${inr(h.openingBalance)}`],
    row: (t) => { const d = parts(t.date), ds = `${+d.d} ${d.mon} ${d.y}`; return [ds, ds, wrap(t.narration, 28), t.ref, t.debit ? inr(t.debit) : "", t.credit ? inr(t.credit) : "", inr(t.balance)]; },
  },
  {
    // Short dates (dd/mm/yy), value date after the reference, "Withdrawal Amt." headers.
    file: "layout-b.pdf", bank: "Tamira Urban Bank (Synthetic)", size: 7,
    cols: [{ label: "Date", x: 36 }, { label: "Narration", x: 80 }, { label: "Chq./Ref.No.", x: 262 }, { label: "Value Dt", x: 330 }, { label: "Withdrawal Amt.", x: 440, align: "right" }, { label: "Deposit Amt.", x: 502, align: "right" }, { label: "Closing Balance", x: 565, align: "right" }],
    info: (h) => [`${h.accountHolder}`, `Account No : ${h.accountNumber}`, `Statement From : 01/11/25 To : 31/10/26`],
    row: (t) => { const d = parts(t.date), ds = `${d.d}/${d.m}/${d.y.slice(2)}`; return [ds, wrap(t.narration, 34), t.ref, ds, t.debit ? inr(t.debit) : "", t.credit ? inr(t.credit) : "", inr(t.balance)]; },
  },
  {
    // Newest first, one Amount column with a Dr/Cr marker, balances suffixed "Cr".
    file: "layout-c.pdf", bank: "Vaigai Finance Bank (Synthetic)", size: 7, newestFirst: true,
    cols: [{ label: "Date", x: 36 }, { label: "Transaction Details", x: 100 }, { label: "Amount (INR)", x: 430, align: "right" }, { label: "Dr/Cr", x: 445 }, { label: "Balance (INR)", x: 565, align: "right" }],
    info: (h) => [`Customer Name: ${h.accountHolder}`, `A/c No: ${h.accountNumber}`, `Opening Balance: ${inr(h.openingBalance)}`],
    row: (t) => { const d = parts(t.date); return [`${d.d}-${d.mon}-${d.y}`, t.narration, inr(t.debit || t.credit), t.debit ? "Dr" : "Cr", `${inr(t.balance)} Cr`]; },
  },
  {
    // Unusual headers the layout parser does not recognise: this one is read by the AI and checked by the balance chain.
    file: "layout-d-ai.pdf", bank: "Palar Small Finance Bank (Synthetic)", size: 7,
    cols: [{ label: "When", x: 36 }, { label: "What happened", x: 90 }, { label: "Money out", x: 400, align: "right" }, { label: "Money in", x: 480, align: "right" }, { label: "Left", x: 565, align: "right" }],
    info: (h) => [`Holder: ${h.accountHolder}`, `Number: ${h.accountNumber}`],
    row: (t) => { const d = parts(t.date); return [`${d.y}-${d.m}-${d.d}`, t.narration, t.debit ? inr(t.debit) : "", t.credit ? inr(t.credit) : "", inr(t.balance)]; },
  },
];

async function scanned() {
  // An image-only page: shapes where text would be, no text layer. Kanaku must refuse it clearly.
  const doc = await PDFDocument.create();
  const p = doc.addPage([W, H]);
  for (let i = 0; i < 40; i++) p.drawRectangle({ x: 36, y: 780 - i * 17, width: 300 + ((i * 37) % 220), height: 7, color: rgb(0.7, 0.7, 0.7) });
  return doc.save();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const txns = buildSamples().find((s) => s.profile.id === "arun-auto-spares")!.statement.txns;
  for (const L of LAYOUTS) { writeFileSync(join(OUT, L.file), await render(L, txns)); console.log(L.file); }
  writeFileSync(join(OUT, "scanned.pdf"), await scanned());
  console.log("scanned.pdf");
}

main();

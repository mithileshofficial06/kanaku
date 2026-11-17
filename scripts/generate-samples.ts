// Renders the synthetic businesses into realistic PDFs under public/samples/<id>/.
// Run: npm run gen:samples
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { buildSamples, type SampleBusiness } from "../src/lib/samples/build";
import { inr } from "../src/lib/format";

const OUT = join(process.cwd(), "public", "samples");
const W = 595, H = 842, ROW = 15, TOP = 760, BOTTOM = 60;
// Column anchors. Amount columns are right-aligned at these x positions.
export const COLS = { date: 36, narration: 96, ref: 330, debitR: 440, creditR: 505, balanceR: 565 };
const grey = rgb(0.45, 0.45, 0.45);

const fmtDate = (s: string) => { const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };

function right(p: PDFPage, text: string, xr: number, y: number, f: PDFFont, size = 8) {
  p.drawText(text, { x: xr - f.widthOfTextAtSize(text, size), y, size, font: f });
}

async function statementPdf(s: SampleBusiness) {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const ft = await doc.embedFont(StandardFonts.TimesRoman); // used only by the "editor" in the fraud file
  const { header: h, txns } = s.statement;
  const tamperedIds = new Set(s.tampered.map((t) => t.id));

  let page!: PDFPage, y = 0, pageNo = 0;
  const newPage = () => {
    page = doc.addPage([W, H]); pageNo++;
    page.drawText(h.bankName, { x: 36, y: 805, size: 13, font: fb });
    page.drawText("Statement of Account", { x: 36, y: 790, size: 9, font: f, color: grey });
    if (pageNo === 1) {
      const info = [
        `Account Holder: ${h.accountHolder}`, `Account No: ${h.accountNumber}`,
        `Period: ${fmtDate(h.periodFrom)} to ${fmtDate(h.periodTo)}`, `Opening Balance: ${inr(h.openingBalance)}`,
      ];
      info.forEach((t, i) => page.drawText(t, { x: 330, y: 805 - i * 11, size: 8, font: f }));
    }
    y = TOP;
    page.drawText("Date", { x: COLS.date, y, size: 8, font: fb });
    page.drawText("Narration", { x: COLS.narration, y, size: 8, font: fb });
    page.drawText("Chq/Ref No", { x: COLS.ref, y, size: 8, font: fb });
    right(page, "Withdrawal", COLS.debitR, y, fb);
    right(page, "Deposit", COLS.creditR, y, fb);
    right(page, "Balance", COLS.balanceR, y, fb);
    page.drawLine({ start: { x: 36, y: y - 4 }, end: { x: W - 30, y: y - 4 }, thickness: 0.5, color: grey });
    y -= ROW + 2;
  };
  newPage();
  for (const t of txns) {
    if (y < BOTTOM) newPage();
    t.page = pageNo; t.y = y;
    page.drawText(fmtDate(t.date), { x: COLS.date, y, size: 8, font: f });
    const narr = t.narration.length > 44 ? t.narration.slice(0, 44) : t.narration;
    page.drawText(narr, { x: COLS.narration, y, size: 7.5, font: f });
    page.drawText(t.ref, { x: COLS.ref, y, size: 7.5, font: f });
    const amtFont = tamperedIds.has(t.id) ? ft : f;
    if (t.debit) right(page, inr(t.debit), COLS.debitR, y, amtFont);
    if (t.credit) right(page, inr(t.credit), COLS.creditR, y, amtFont);
    right(page, inr(t.balance), COLS.balanceR, y, f);
    y -= ROW;
  }
  const pages = doc.getPages();
  pages.forEach((p, i) => p.drawText(`Page ${i + 1} of ${pages.length}  |  Computer generated statement. Synthetic data for demonstration.`, { x: 36, y: 30, size: 7, font: f, color: grey }));

  const created = new Date(Date.UTC(2026, 10, 3, 9, 15));
  doc.setTitle(`Statement ${h.accountNumber}`);
  doc.setCreationDate(created);
  if (s.tampered.length) {
    doc.setProducer("QuickPDF Editor Online 3.2");
    doc.setCreator("QuickPDF Editor Online");
    doc.setModificationDate(new Date(Date.UTC(2026, 10, 12, 22, 41)));
  } else {
    doc.setProducer("Arthavya CBS Statement Engine 7.1");
    doc.setCreator("Arthavya CBS");
    doc.setModificationDate(created);
  }
  return doc.save();
}

async function tablePdf(title: string, sub: string[], head: string[], rows: string[][], widths: number[]) {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica);
  const fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const p = doc.addPage([W, H]);
  p.drawText(title, { x: 36, y: 800, size: 13, font: fb });
  sub.forEach((t, i) => p.drawText(t, { x: 36, y: 782 - i * 12, size: 9, font: f }));
  let y = 782 - sub.length * 12 - 20;
  const xs = widths.reduce<number[]>((a, w, i) => [...a, (a[i - 1] ?? 36) + (i ? widths[i - 1] : 0)], []);
  const row = (cells: string[], font: PDFFont) => {
    cells.forEach((c, i) => (i === 0 ? p.drawText(c, { x: xs[i], y, size: 9, font }) : right(p, c, xs[i] + widths[i] - 8, y, font, 9)));
    y -= 16;
  };
  row(head, fb);
  rows.forEach((r) => row(r, f));
  p.drawText("Synthetic document generated for demonstration. Not issued by any tax authority.", { x: 36, y: 30, size: 7, font: f, color: grey });
  doc.setProducer("Kanaku sample generator");
  return doc.save();
}

async function main() {
  const samples = buildSamples();
  const index = [];
  for (const s of samples) {
    const dir = join(OUT, s.profile.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "statement.pdf"), await statementPdf(s));
    const p = s.profile;
    writeFileSync(join(dir, "gst.pdf"), await tablePdf(
      "GSTR-3B Summary (Synthetic)", [`Legal name: ${p.businessName.toUpperCase()}`, `GSTIN: ${p.gstin}`],
      ["Tax period", "Taxable outward supplies", "Tax paid (cash)"],
      s.gst.map((g) => [g.month, inr(g.taxableTurnover), inr(g.taxPaid)]), [120, 200, 160]));
    writeFileSync(join(dir, "itr.pdf"), await tablePdf(
      "Income Tax Return Summary (Synthetic)", [`Name: ${p.ownerName}  (Proprietor, ${p.businessName})`, `Assessment Year: ${s.itr.assessmentYear}   Financial Year: ${s.itr.financialYear}`],
      ["Item", "Amount (INR)"],
      [["Gross turnover / receipts", inr(s.itr.grossTurnover)], ["Net profit from business", inr(s.itr.netProfit)]], [300, 180]));
    writeFileSync(join(dir, "profile.json"), JSON.stringify(p, null, 2));
    index.push(p);
    const last = s.statement.txns.at(-1)!;
    console.log(`${p.id}: ${s.statement.txns.length} txns, ${last.page} pages, closing ${inr(last.balance)}`);
  }
  writeFileSync(join(OUT, "index.json"), JSON.stringify(index, null, 2));
}

main();

// Blind test: a statement in a layout Kanaku was never tuned on, for a business the engine has never seen.
// Fictional bank, fictional people, footer marks it synthetic. Writes a clean copy and a forged copy
// (one credit inflated, typed in another font, saved by an editor) plus the ground truth as JSON.
// Run: npx tsx scripts/make-realistic-statement.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

const OUT = join(process.cwd(), "test-data", "blind");
let seed = 20261118;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const between = (a: number, b: number) => a + rnd() * (b - a);
const paise = (v: number) => Math.round(v * 100) / 100;
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
const digits = (n: number) => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join("");

interface Row { date: string; narration: string; chq: string; debit: number; credit: number; balance: number; forged?: boolean }

const OPENING = 284316.42;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const fmt = (s: string) => { const [y, m, d] = s.split("-"); return `${d}-${m}-${y}`; };
const money = (v: number) => {
  const [i, f] = v.toFixed(2).split(".");
  const last3 = i.slice(-3), rest = i.slice(0, -3);
  return (rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," : "") + last3 + "." + f;
};

function build(): Row[] {
  const ev: Omit<Row, "balance">[] = [];
  const add = (date: string, narration: string, debit: number, credit: number, chq = "") => ev.push({ date, narration, chq, debit: paise(debit), credit: paise(credit) });
  // Oct 2025 .. Sep 2026: a sweets and bakery shop in Tiruchirappalli
  for (let k = 0; k < 12; k++) {
    const y = k < 3 ? 2025 : 2026, m = ((9 + k) % 12) + 1;
    const days = new Date(y, m, 0).getDate();
    const festive = m === 10 || m === 11 || m === 1 ? 1.6 : m === 4 ? 1.2 : 1;
    for (let d = 1; d <= days; d++) {
      const date = iso(y, m, d);
      // Merchant UPI settlements land most days
      if (rnd() < 0.8) add(date, `UPI SETTLEMENT/${pick(["PAYTM PAYMENTS SERVICES", "PHONEPE PVT LTD", "BHARATPE"])}/MID${digits(8)}/${digits(12)}`, 0, between(8000, 26000) * festive);
      if (d % 7 === 3) add(date, "BY CASH - TRICHY CANTONMENT BR", 0, Math.round(between(18000, 42000) * festive / 100) * 100);
      if (d % 7 === 5) add(date, `NEFT DR-SBIN0007721-SRI MURUGAN FLOUR AND RAVA MILLS-N${digits(10)}`, between(16000, 48000) * festive, 0);
      if (d % 7 === 1) add(date, `NEFT DR-IOBA0001290-KANNAN SUGAR AND JAGGERY TRADERS-N${digits(10)}`, between(9000, 26000) * festive, 0);
      if (d % 10 === 2) add(date, `IMPS/P2A/${digits(12)}/AAVIN DAIRY DISTRIBUTOR/MILK`, between(11000, 21000), 0);
      if (rnd() < 0.05) add(date, `POS 4591XXXXXXXX3341 METRO WHOLESALE TRICHY`, between(3000, 14000), 0);
      if (rnd() < 0.04) add(date, `ATM WDL/TRICHY CANTONMENT/${digits(6)}`, Math.round(between(5, 10)) * 1000, 0);
      if (d === 2) add(date, `IMPS/P2A/${digits(12)}/K SUBRAMANIAN/SHOP RENT ${MON[m - 1].toUpperCase()}`, 38000, 0);
      if (d === 5) add(date, `ACH D- CHOLAMANDALAM FINANCE-LN${digits(7)}`, 21640, 0);
      if (d === 7) for (const n of ["PRAKASH R", "SELVI M", "KARTHIK S", "MUTHU LAKSHMI P"]) add(date, `NEFT DR-SALARY ${MON[m - 1].toUpperCase()}-${n}`, between(12500, 16500), 0);
      if (d === 27) add(date, `IMPS/P2A/${digits(12)}/R ANNAPOORANI/SELF TRF TO SB`, Math.round(between(185000, 235000) * (festive > 1 ? 1.25 : 1) / 1000) * 1000, 0);
      if (d === 19) add(date, `GST PMT CBIC CPIN ${digits(14)}`, between(9000, 17000) * festive, 0);
      if (d === 14 && m % 2 === 0) add(date, `BILLPAY/TNPDCL/${digits(9)}/EB BILL`, between(9000, 15500), 0);
      if (rnd() < 0.025) add(date, `NEFT CR-HDFC0000412-${pick(["NATIONAL COLLEGE CANTEEN", "SRI RANGA KALYANA MANDAPAM", "BHEL STAFF CLUB"])}-BULK ORDER`, 0, between(28000, 76000));
      if (d === days && m % 3 === 0) add(date, "SMS ALERT CHARGES FOR QTR INCL GST", 17.7, 0);
      if (d === days && m % 3 === 0) add(date, "CASH HANDLING CHARGES INCL GST", between(200, 600), 0);
    }
    // One returned EMI in June 2026, then a successful re-presentment
    if (y === 2026 && m === 6) {
      add(iso(y, m, 5), "ACH D- CHOLAMANDALAM FINANCE RETURN-INSUFFICIENT FUNDS", 0, 21640);
      add(iso(y, m, 5), "ACH RETURN CHARGES INCL GST", 590, 0);
      add(iso(y, m, 9), `ACH D- CHOLAMANDALAM FINANCE-LN${digits(7)}-REPRESENT`, 21640, 0);
    }
  }
  ev.sort((a, b) => a.date.localeCompare(b.date));
  let bal = OPENING;
  return ev.map((e) => { bal = paise(bal + e.credit - e.debit); return { ...e, balance: bal }; });
}

function wrap(s: string, n: number): string[] {
  const out: string[] = []; let cur = "";
  for (const w of s.split(/(?<=[ /-])/)) { if ((cur + w).length > n && cur) { out.push(cur.trimEnd()); cur = w; } else cur += w; }
  if (cur) out.push(cur.trimEnd());
  return out;
}

async function render(rows: Row[], forged: boolean) {
  const doc = await PDFDocument.create();
  const f = await doc.embedFont(StandardFonts.Helvetica), fb = await doc.embedFont(StandardFonts.HelveticaBold);
  const ft = await doc.embedFont(StandardFonts.TimesRoman);
  const grey = rgb(0.4, 0.4, 0.4), band = rgb(0.9, 0.93, 0.97);
  const W = 595, H = 842;
  const X = { tran: 28, value: 72, part: 116, chq: 300, wdl: 392, dep: 470, bal: 568 };
  const right = (p: PDFPage, t: string, xr: number, y: number, font: PDFFont, size = 7) => p.drawText(t, { x: xr - font.widthOfTextAtSize(t, size), y, size, font });
  let page!: PDFPage, y = 0, n = 0;
  const header = () => {
    page = doc.addPage([W, H]); n++;
    page.drawText("CAUVERY VALLEY BANK LTD", { x: 28, y: 808, size: 14, font: fb, color: rgb(0.05, 0.2, 0.45) });
    page.drawText("Tiruchirappalli Cantonment Branch, 14 Bharathiar Salai, Tiruchirappalli 620001", { x: 28, y: 796, size: 7, font: f, color: grey });
    if (n === 1) {
      page.drawText("STATEMENT OF ACCOUNT", { x: 28, y: 772, size: 10, font: fb });
      const L = ["M/S ANNAPOORNA SWEETS AND BAKERY", "Prop: R. Annapoorani", "22 Williams Road, Cantonment", "Tiruchirappalli, Tamil Nadu 620001"];
      L.forEach((t, i) => page.drawText(t, { x: 28, y: 756 - i * 10, size: 7.5, font: i ? f : fb }));
      const R = [["Account No", "5021 0004 8813 06"], ["Account Type", "Current Account - Business"], ["IFSC", "CVBL0000417"], ["Customer ID", "60218841"], ["Currency", "INR"], ["Statement Period", "01-10-2025 to 30-09-2026"]];
      R.forEach(([k, v], i) => { page.drawText(k, { x: 330, y: 768 - i * 10, size: 7, font: f, color: grey }); page.drawText(`: ${v}`, { x: 400, y: 768 - i * 10, size: 7, font: f }); });
      y = 690;
    } else {
      page.drawText(`Account No : 5021 0004 8813 06    M/S ANNAPOORNA SWEETS AND BAKERY`, { x: 28, y: 780, size: 7, font: f, color: grey });
      y = 758;
    }
    page.drawRectangle({ x: 24, y: y - 4, width: W - 48, height: 14, color: band });
    page.drawText("Tran Date", { x: X.tran, y, size: 7, font: fb }); page.drawText("Value Date", { x: X.value, y, size: 7, font: fb });
    page.drawText("Particulars", { x: X.part, y, size: 7, font: fb }); page.drawText("Chq.No.", { x: X.chq, y, size: 7, font: fb });
    right(page, "Withdrawals", X.wdl, y, fb); right(page, "Deposits", X.dep, y, fb); right(page, "Balance", X.bal, y, fb);
    y -= 16;
  };
  header();
  // Opening balance line inside the table, as many banks print it
  page.drawText("01-10-2025", { x: X.tran, y, size: 7, font: f });
  page.drawText("OPENING BALANCE", { x: X.part, y, size: 7, font: fb });
  right(page, `${money(OPENING)} Cr`, X.bal, y, f);
  y -= 13;
  for (const r of rows) {
    const lines = wrap(r.narration, 40);
    if (y - (lines.length - 1) * 8.5 < 60) header();
    page.drawText(fmt(r.date), { x: X.tran, y, size: 7, font: f });
    page.drawText(fmt(r.date), { x: X.value, y, size: 7, font: f });
    lines.forEach((t, i) => page.drawText(t, { x: X.part, y: y - i * 8.5, size: 7, font: f }));
    if (r.chq) page.drawText(r.chq, { x: X.chq, y, size: 7, font: f });
    const amtFont = forged && r.forged ? ft : f;
    if (r.debit) right(page, money(r.debit), X.wdl, y, amtFont);
    if (r.credit) right(page, money(r.credit), X.dep, y, amtFont);
    right(page, `${money(r.balance)} Cr`, X.bal, y, f);
    y -= 13 + (lines.length - 1) * 8.5;
  }
  // Summary block after the table
  const tw = rows.reduce((s, r) => s + r.debit, 0), td = rows.reduce((s, r) => s + r.credit, 0);
  if (y < 120) header();
  y -= 14;
  page.drawText("STATEMENT SUMMARY", { x: 28, y, size: 8, font: fb }); y -= 12;
  for (const [k, v] of [["Opening Balance", OPENING], ["Total Withdrawals", tw], ["Total Deposits", td], ["Closing Balance", rows.at(-1)!.balance]] as const) {
    page.drawText(k, { x: 28, y, size: 7, font: f }); right(page, money(v), 220, y, f); y -= 10;
  }
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText("This is a computer generated statement and does not require a signature. Please report discrepancies within 15 days.", { x: 28, y: 38, size: 6, font: f, color: grey });
    p.drawText(`SYNTHETIC TEST STATEMENT - fictional bank and customer, not issued by any bank.      Page ${i + 1} of ${pages.length}`, { x: 28, y: 28, size: 6, font: f, color: grey });
  });
  doc.setCreationDate(new Date(Date.UTC(2026, 9, 2, 6, 30)));
  if (forged) { doc.setProducer("PDF Editor Pro 11.2"); doc.setCreator("PDF Editor Pro"); doc.setModificationDate(new Date(Date.UTC(2026, 10, 14, 21, 5))); }
  else { doc.setProducer("CVB Core Statement Service 4.2"); doc.setCreator("CVB eStatement"); doc.setModificationDate(new Date(Date.UTC(2026, 9, 2, 6, 30))); }
  return doc.save();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const rows = build();
  writeFileSync(join(OUT, "annapoorna-clean.pdf"), await render(rows, false));
  // Forgery: one ordinary settlement in July 2026 inflated by 60,000. Its balance is left as printed, as a hurried editor would.
  const forgedRows = rows.map((r) => ({ ...r }));
  const target = forgedRows.findIndex((r) => r.date.startsWith("2026-07-1") && r.credit > 0 && r.narration.startsWith("UPI SETTLEMENT"));
  forgedRows[target] = { ...forgedRows[target], credit: paise(forgedRows[target].credit + 60000), forged: true };
  writeFileSync(join(OUT, "annapoorna-forged.pdf"), await render(forgedRows, true));
  writeFileSync(join(OUT, "truth.json"), JSON.stringify({ opening: OPENING, rows, forgedIndex: target }, null, 1));
  const months = new Set(rows.map((r) => r.date.slice(0, 7))).size;
  const credits = rows.reduce((s, r) => s + r.credit, 0);
  console.log(`${rows.length} rows over ${months} months, closing ${money(rows.at(-1)!.balance)}, avg credits/month ${money(credits / months)}, forged row index ${target} (${rows[target].date}, ${money(rows[target].credit)} -> ${money(forgedRows[target].credit)})`);
}
main();

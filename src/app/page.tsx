import Landing, { type SampleCard } from "@/components/Landing";
import type { HeroData, HeroRow } from "@/components/Hero";
import { demoReports } from "@/lib/demo";
import { inr, lakh, r2 } from "@/lib/format";

const SCENARIO: Record<string, string> = { healthy: "Healthy business", stressed: "Under stress", fraud: "Suspicious file" };

export default async function Home() {
  const reports = await demoReports();
  const fraud = reports["sri-lakshmi-traders"], stressed = reports["arun-auto-spares"];

  // Scanner rows: the tampered row with context, all real output of the parser.
  const badId = (fraud.flags.find((f) => f.code === "tamper_chain")?.evidence[0] as { id: string } | undefined)?.id;
  const badIdx = fraud.txns.findIndex((t) => t.id === badId);
  const slice = fraud.txns.slice(Math.max(0, badIdx - 5), badIdx + 3);
  const rows: HeroRow[] = slice.map((t, i) => ({ id: t.id, date: t.date, narration: t.narration, debit: t.debit, credit: t.credit, balance: t.balance, bad: t.id === badId, expected: i ? r2(slice[i - 1].balance + t.credit - t.debit) : undefined }));

  // Floating cards: real findings from the engine.
  const rtFlag = fraud.flags.find((f) => f.code === "round_trip")!;
  const [outId, backId] = rtFlag.evidence.slice(0, 2).map((e) => (e as { id: string }).id);
  const o = fraud.txns.find((t) => t.id === outId)!, b = fraud.txns.find((t) => t.id === backId)!;
  const gstAnn = fraud.metrics.gstAnnualised ?? 0;
  const ticker = [
    `${badId}: balance chain broken, ₹45,000 edited`,
    `${rtFlag.evidence.length / 2} round trips with linked parties`,
    `GST turnover ${(gstAnn / fraud.metrics.bankAnnualised).toFixed(1)}x genuine bank sales`,
    `PDF saved by "${fraud.statement.pdfMeta?.producer}"`,
    `Arun Auto Spares: ${lakh(stressed.path.baseline)} today, ${lakh(stressed.path.combined)} with the Path to Yes`,
    `Meenakshi Textiles: approved ${lakh(reports["meenakshi-textiles"].decision.amount)}, no red flags`,
    `998 statement rows read exactly, 0 numbers computed by the AI`,
  ];
  const all = Object.values(reports).flatMap((r) => r.txns.filter((t) => t.credit || t.debit).map((t) => `${t.credit ? "+" : "-"}${inr(t.credit || t.debit)}`));
  const columns = Array.from({ length: 14 }, (_, c) => Array.from({ length: 34 }, (_, k) => all[(c * 61 + k * 7) % all.length]));

  const hero: HeroData = {
    rows,
    roundTrip: { party: o.cp.replace(/\b(\w)(\w*)/g, (_, a, z) => a + z.toLowerCase()), out: o.debit, back: b.credit, days: Math.round((Date.parse(b.date) - Date.parse(o.date)) / 86400000), outId, backId, count: rtFlag.evidence.length / 2 },
    gst: { gst: lakh(gstAnn), bank: lakh(fraud.metrics.bankAnnualised), ratio: `${(gstAnn / fraud.metrics.bankAnnualised).toFixed(1)}x` },
    path: { from: lakh(stressed.path.baseline), to: lakh(stressed.path.combined), requested: lakh(stressed.profile.loanRequested), fromPct: Math.round((stressed.path.baseline / stressed.profile.loanRequested) * 100) },
    ticker, columns,
  };

  const samples: SampleCard[] = Object.values(reports).map((r) => ({
    id: r.profile.id, name: r.profile.businessName, city: r.profile.city, tagline: r.profile.tagline, scenario: SCENARIO[r.profile.scenario],
    requested: lakh(r.profile.loanRequested), headline: r.decision.verdict === "approve_reduced" ? `${lakh(r.decision.amount)} now, path to ${lakh(r.profile.loanRequested)}` : r.decision.headline,
    flags: r.flags.length, verdict: r.decision.verdict,
  }));
  return <Landing hero={hero} samples={samples} />;
}

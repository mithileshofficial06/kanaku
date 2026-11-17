import Landing, { type HeroRow, type SampleCard } from "@/components/Landing";
import { demoReports } from "@/lib/demo";
import { lakh, r2 } from "@/lib/format";

const SCENARIO: Record<string, string> = { healthy: "Healthy business", stressed: "Under stress", fraud: "Suspicious file" };

export default async function Home() {
  const reports = await demoReports();
  const fraud = reports["sri-lakshmi-traders"];
  const badId = fraud.flags.find((f) => f.code === "tamper_chain")?.evidence[0];
  const badIdx = fraud.txns.findIndex((t) => badId?.kind === "row" && t.id === badId.id);
  const slice = fraud.txns.slice(Math.max(0, badIdx - 5), badIdx + 4);
  const rows: HeroRow[] = slice.map((t, i) => {
    const prev = i ? slice[i - 1].balance : NaN;
    return { id: t.id, date: t.date, narration: t.narration, debit: t.debit, credit: t.credit, balance: t.balance, bad: t.id === (badId as { id: string }).id, expected: r2(prev + t.credit - t.debit) };
  });
  const samples: SampleCard[] = Object.values(reports).map((r) => ({
    id: r.profile.id, name: r.profile.businessName, city: r.profile.city, tagline: r.profile.tagline, scenario: SCENARIO[r.profile.scenario],
    requested: lakh(r.profile.loanRequested), headline: r.decision.verdict === "approve_reduced" ? `${lakh(r.decision.amount)} now, path to ${lakh(r.profile.loanRequested)}` : r.decision.headline,
    flags: r.flags.length, verdict: r.decision.verdict,
  }));
  return <Landing rows={rows} samples={samples} />;
}

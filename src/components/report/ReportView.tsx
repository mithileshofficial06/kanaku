"use client";
import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import type { Report } from "@/lib/engine/analyze";
import { lakh } from "@/lib/format";
import { Counter, EASE, Reveal, SplitChars } from "../motion";
import { EvidenceButton, EvidenceProvider } from "./Evidence";
import { Ask, Memo } from "./Memo";
import { PathToYes } from "./PathToYes";
import { CrossCheck, FlagList, MoneyFlow, MonthlyChart, TxnTable, Waterfall } from "./Widgets";

const VERDICT: Record<Report["decision"]["verdict"], { label: string; cls: string }> = {
  approve: { label: "Approve", cls: "bg-forest" },
  approve_reduced: { label: "Approve a reduced amount", cls: "bg-amber" },
  decline: { label: "Decline for now", cls: "bg-ink" },
  refer: { label: "Refer to fraud review", cls: "bg-red" },
};

const SECTIONS = [
  ["memo", "Memo"], ["capacity", "Capacity"], ["flags", "Red flags"], ["path", "Path to Yes"], ["flow", "Money flow"], ["documents", "Documents"], ["transactions", "Transactions"], ["ask", "Ask"],
] as const;

function Section({ id, num, title, explain, children, tone = "ivory" }: { id: string; num: string; title: string; explain: string; children: ReactNode; tone?: "ivory" | "ivory-2" }) {
  return (
    <section id={id} className={`scroll-mt-24 border-b border-line ${tone === "ivory-2" ? "bg-ivory-2" : "bg-ivory"}`}>
      <div className="mx-auto max-w-[1400px] px-5 py-20 md:px-10">
        <div className="mb-12 grid gap-6 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="font-mono text-xs text-crimson">{num}</p>
            <SplitChars as="h2" text={title} className="display mt-2 block text-5xl text-crimson md:text-6xl" stagger={0.02} />
          </div>
          <Reveal><p className="serif border-l-2 border-crimson pl-4 text-[17px] italic leading-snug text-ink-muted"><span className="not-italic font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-crimson">What this means · </span>{explain}</p></Reveal>
        </div>
        {children}
      </div>
    </section>
  );
}

function SubNav() {
  const [active, setActive] = useState("memo");
  useEffect(() => {
    const obs = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-40% 0px -55% 0px" });
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);
  return (
    <nav className="sticky top-0 z-30 border-b border-line bg-ivory/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-5 md:px-10">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className={`relative whitespace-nowrap px-3 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] ${active === id ? "text-crimson" : "text-ink-muted hover:text-ink"}`}>
            {label}
            {active === id && <motion.span layoutId="subnav" className="absolute bottom-0 left-0 right-0 h-[3px] bg-crimson" />}
          </a>
        ))}
      </div>
    </nav>
  );
}

function Banner({ r, onBack }: { r: Report; onBack?: () => void }) {
  const v = VERDICT[r.decision.verdict];
  const m = r.metrics, e = r.eligibility;
  const stats: { label: string; value: ReactNode; evs?: Parameters<typeof EvidenceButton>[0]["evs"]; title?: string }[] = [
    { label: "Sales into bank / month", value: lakh(e.monthlyInflow) },
    { label: "Surplus before EMIs", value: lakh(e.surplus) },
    { label: "Existing EMIs / month", value: lakh(e.existingEmi), evs: m.loans.flatMap((l) => l.rowIds.map((id) => ({ kind: "row" as const, id }))), title: "Existing loan EMIs" },
    { label: "Average balance", value: lakh(m.abb) },
    { label: "EMI bounces", value: String(m.bounceRowIds.length), evs: m.bounceRowIds.map((id) => ({ kind: "row" as const, id })), title: "EMI bounces" },
    { label: "Red flags", value: String(r.flags.length) },
  ];
  return (
    <header className="relative overflow-hidden bg-crimson text-ivory grain">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] bg-[radial-gradient(closest-side,rgba(163,20,31,0.9),transparent)]" />
      <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-6 md:px-10">
        {onBack && <button onClick={onBack} className="label mb-8 flex items-center gap-2 text-ivory/80 hover:text-ivory"><span aria-hidden>&larr;</span> Choose another file</button>}
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <p className="label text-ivory/70">Underwriting report · {r.statement.header.periodFrom} to {r.statement.header.periodTo} · {r.statement.txnCount} rows{r.statement.source === "llm" ? " · extracted by AI" : ""}</p>
            <SplitChars as="h1" text={r.profile.businessName} className="display mt-4 block text-6xl md:text-8xl" stagger={0.025} />
            <p className="serif mt-4 text-xl italic text-ivory/85">{r.profile.city} · {r.profile.vintageYears} years in business · asks {lakh(r.profile.loanRequested)} for {r.profile.tenureMonths} months</p>
          </div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.4, ease: EASE }} className="bg-ivory p-7 text-ink">
            <span className={`label inline-block px-2 py-1 text-[10px] text-ivory ${v.cls}`}>{v.label}</span>
            <p className="display mt-4 text-6xl text-crimson">{r.decision.amount ? <Counter to={r.decision.amount} format={(n) => lakh(Math.round(n / 5000) * 5000)} /> : r.decision.verdict === "refer" ? "On hold" : "₹0"}</p>
            <p className="mt-2 text-sm text-ink-muted">{r.decision.verdict === "refer" ? `Computed capacity ${lakh(e.eligible)} is not offered until integrity issues are resolved.` : `Capacity ${lakh(e.eligible)} · limited by ${e.binding}`}</p>
            <ul className="mt-4 space-y-1 border-t border-line pt-4 text-sm">{r.decision.reasons.slice(0, 3).map((x) => <li key={x} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 bg-crimson" />{x}</li>)}</ul>
          </motion.div>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-px bg-ivory/20 md:grid-cols-3 lg:grid-cols-6">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.06 }} className="bg-crimson p-5">
              <EvidenceButton evs={s.evs ?? []} title={s.title ?? s.label}>
                <p className="display text-3xl">{s.value}</p>
                <p className={`mt-1 text-[10px] uppercase tracking-[0.16em] text-ivory/70 ${s.evs?.length ? "underline decoration-ivory/40 underline-offset-4" : ""}`}>{s.label}</p>
              </EvidenceButton>
            </motion.div>
          ))}
        </div>
        {r.statement.checks && <Checks r={r} />}
      </div>
    </header>
  );
}

/** Who did what on this file: the reader, the balance check, the AI's labelling and the memo. */
function Checks({ r }: { r: Report }) {
  const c = r.statement.checks!, n = r.statement.txnCount;
  const short = (m?: string) => (m ?? "").split("/").pop();
  const cells = [
    { k: "Read by", v: r.statement.source === "llm" ? "AI reader" : "Layout reader", d: r.statement.source === "llm" ? `${short(c.readModel)} copied every cell; arithmetic decided money in or out` : "Columns mapped from the page layout, no AI needed" },
    { k: "Balance chain", v: `${c.chainOk} of ${n} rows add up`, d: c.chainOk === n ? "Every row reconciles with the one before it" : `${n - c.chainOk} ${n - c.chainOk === 1 ? "row does" : "rows do"} not reconcile: see Red flags` },
    { k: "AI labelling", v: c.aiLabelled ? `${c.aiLabelled} unclear narration${c.aiLabelled === 1 ? "" : "s"}` : "Not needed", d: c.aiLabelled ? `Labelled by ${short(c.labelModel)}; rules handled the rest` : "Rules recognised every narration" },
    { k: "Memo and answers", v: "Written by AI, checked by code", d: "Every rupee figure and row citation is verified before display" },
  ];
  return (
    <div className="mt-px grid gap-px bg-ivory/20 sm:grid-cols-2 lg:grid-cols-4">
      {cells.map((x) => (
        <div key={x.k} className="bg-crimson-deep p-5">
          <p className="label text-[10px] text-ivory/60">{x.k}</p>
          <p className={`serif mt-2 text-lg ${x.k === "Balance chain" && c.chainOk !== n ? "text-amber-soft" : ""}`}>{x.v}</p>
          <p className="mt-1 text-xs text-ivory/70">{x.d}</p>
        </div>
      ))}
    </div>
  );
}

export function ReportView({ r, pdfUrl, onBack }: { r: Report; pdfUrl?: string; onBack?: () => void }) {
  const fraud = r.decision.verdict === "refer";
  return (
    <EvidenceProvider report={r} pdfUrl={pdfUrl}>
      <Banner r={r} onBack={onBack} />
      <SubNav />
      <Section id="memo" num="01" title="Underwriting memo" explain="A plain-English summary written by the AI from numbers the engine computed. Every chip opens the source row; every figure was checked.">
        <Memo report={r} />
      </Section>
      <Section id="capacity" num="02" title="Repayment capacity" tone="ivory-2" explain="How the eligible amount is built, step by step: what comes in, what goes out, what existing loans take, and what is safely left for a new EMI.">
        <Waterfall r={r} />
        <div className="mt-16"><p className="label mb-4 text-crimson">Twelve months at a glance</p><MonthlyChart r={r} /></div>
      </Section>
      <Section id="flags" num="03" title="Red flags" explain="Everything that lowers trust in this file, most serious first. Critical findings stop the loan regardless of capacity.">
        <FlagList flags={r.flags} />
        {r.strengths.length > 0 && (
          <div className="mt-10"><p className="label text-forest">Strengths</p><ul className="mt-3 grid gap-2 md:grid-cols-2">{r.strengths.map((s) => <li key={s} className="flex gap-3 border border-forest/30 bg-forest-soft p-3 text-sm"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-forest" />{s}</li>)}</ul></div>
        )}
      </Section>
      <Section id="path" num="04" title="Path to Yes" tone="ivory-2" explain={fraud ? "Not offered while document integrity is in question. Ask the borrower to share the statement directly from the bank through the Account Aggregator network." : "What the business owner can change to qualify for more. Move the sliders: the offer is recomputed with the same maths as the report."}>
        {fraud ? <p className="serif text-2xl italic text-ink-muted">Path to Yes is withheld for files referred to fraud review.</p> : <PathToYes input={r.input} path={r.path} />}
      </Section>
      <Section id="flow" num="05" title="Money flow" explain="Who pays this business, who it pays, and how much. Red dashed lines are parties that money keeps cycling through. Click a box to see its rows.">
        <MoneyFlow r={r} />
      </Section>
      <Section id="documents" num="06" title="Three documents" tone="ivory-2" explain="The bank statement, GST returns and income tax return should describe the same business. Big gaps mean one of them is not telling the truth.">
        {r.gst || r.itr ? <CrossCheck r={r} /> : <p className="text-ink-muted">GST and ITR were not uploaded, so the cross-check did not run.</p>}
      </Section>
      <Section id="transactions" num="07" title="Every transaction" explain="The full statement as Kanaku read it, with the category assigned to each row. Click any row to see it on the original PDF page.">
        <TxnTable r={r} />
      </Section>
      <Section id="ask" num="08" title="Ask Kanaku" tone="ivory-2" explain="Ask anything about this file. Answers follow the same rules as the memo: facts from the engine, citations to rows, figures verified.">
        <Ask report={r} />
      </Section>
    </EvidenceProvider>
  );
}

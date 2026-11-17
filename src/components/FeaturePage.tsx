"use client";
import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import type { Report } from "@/lib/engine/analyze";
import type { Feature } from "@/lib/features";
import { Arrow, Btn, EASE, Reveal, Rule, SplitChars, SplitWords, useCycle } from "./motion";
import { Footer, Nav } from "./Nav";
import { EvidenceProvider } from "./report/Evidence";
import { Memo } from "./report/Memo";
import { PathToYes } from "./report/PathToYes";
import { CrossCheck, FlagList, MoneyFlow, RoundTrips, TamperChain, Waterfall } from "./report/Widgets";

function Demo({ slug, r }: { slug: string; r: Report }) {
  const only = (codes: string[]) => r.flags.filter((f) => codes.includes(f.code));
  switch (slug) {
    case "repayment-capacity": return <Waterfall r={r} />;
    case "path-to-yes": return <PathToYes input={r.input} path={r.path} />;
    case "tamper-detection": return (
      <div className="grid gap-12 lg:grid-cols-2">
        <div><p className="label mb-4 text-crimson">The balance chain around the edited row</p><TamperChain r={r} /></div>
        <div><p className="label mb-4 text-crimson">All integrity findings</p><FlagList flags={only(["tamper_chain", "tamper_font", "tamper_meta"])} /></div>
      </div>
    );
    case "fraud-patterns": return (
      <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
        <div><p className="label mb-4 text-crimson">Round trips, matched pair by pair</p><RoundTrips r={r} /></div>
        <div><p className="label mb-4 text-crimson">Findings</p><FlagList flags={only(["round_trip", "window_dressing"])} /></div>
      </div>
    );
    case "cross-check": return (
      <div className="grid gap-12 lg:grid-cols-2">
        <div><p className="label mb-4 text-crimson">One business, three turnovers</p><CrossCheck r={r} /></div>
        <div><p className="label mb-4 text-crimson">Findings</p><FlagList flags={only(["gst_vs_bank", "itr_vs_gst"])} /></div>
      </div>
    );
    case "proof": return <Memo report={r} />;
    case "money-flow": return <MoneyFlow r={r} />;
    default: return null;
  }
}

export default function FeaturePage({ feature: f, report, next, prev }: { feature: Feature; report: Report; next: Feature; prev: Feature }) {
  const { scrollYProgress } = useScroll();
  const bar = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const cyc = useCycle(f.steps.length);
  return (
    <main>
      <motion.div className="fixed left-0 top-0 z-50 h-[3px] bg-ivory mix-blend-difference" style={{ width: bar }} />
      <section className="relative overflow-hidden bg-crimson text-ivory grain">
        <div className="pointer-events-none absolute -right-32 top-0 h-[700px] w-[700px] bg-[radial-gradient(closest-side,rgba(163,20,31,0.95),transparent)]" />
        <motion.span initial={{ opacity: 0, x: 80 }} animate={{ opacity: 0.08, x: 0 }} transition={{ duration: 1.4, ease: EASE }} className="display pointer-events-none absolute -right-6 bottom-[-0.12em] select-none text-[42vw] leading-none lg:text-[30vw]" aria-hidden>{f.num}</motion.span>
        <Nav />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-24 pt-10 md:px-10">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="label text-ivory/70"><Link href="/#features" className="hover:text-ivory">Features</Link> / {f.num} · {f.kicker}</motion.p>
          <SplitChars as="h1" text={f.title} className="display mt-6 block max-w-5xl text-6xl md:text-8xl lg:text-[112px]" stagger={0.022} delay={0.1} />
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.8, ease: EASE }} className="serif mt-8 max-w-2xl text-2xl italic leading-snug text-ivory/90">{f.lede}</motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-10 flex flex-wrap items-center gap-4">
            <Btn href="#example" variant="ivory">See the live example <Arrow /></Btn>
            <span className="text-sm text-ivory/75">Running on: {report.profile.businessName} (synthetic)</span>
          </motion.div>
        </div>
      </section>

      <section className="bg-ivory">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-24 md:px-10 lg:grid-cols-[220px_1fr]">
          <Reveal><p className="label text-crimson">The problem</p><Rule className="mt-4 w-16 text-crimson" /></Reveal>
          <SplitWords text={f.problem} className="serif text-3xl font-medium leading-[1.2] md:text-[44px]" />
        </div>
      </section>

      <section className="bg-ivory-2">
        <div className="mx-auto max-w-[1400px] px-5 py-24 md:px-10">
          <p className="label text-crimson">How Kanaku does it</p>
          <div {...cyc.container} className={`mt-10 grid gap-px bg-line ${f.steps.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
            {f.steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.12} {...cyc.item(i)} className="group bg-ivory-2 p-8 transition-colors duration-500 data-[on]:bg-crimson data-[on]:text-ivory">
                <span className="display text-7xl text-crimson/25 transition-colors group-data-[on]:text-ivory/30">0{i + 1}</span>
                <h3 className="display mt-6 text-3xl">{s.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-muted transition-colors group-data-[on]:text-ivory/85">{s.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="example" className="scroll-mt-6 bg-ivory">
        <div className="mx-auto max-w-[1400px] px-5 py-24 md:px-10">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="label text-crimson">Live example</p>
              <SplitChars as="h2" text={report.profile.businessName} className="display mt-3 block text-5xl text-crimson md:text-7xl" stagger={0.02} />
            </div>
            <p className="max-w-md text-sm text-ink-muted">This is the real engine running on a synthetic sample. Click any row chip to open the original statement page with that row highlighted.</p>
          </div>
          <EvidenceProvider report={report} pdfUrl={`/samples/${report.profile.id}/statement.pdf`}>
            <Demo slug={f.slug} r={report} />
          </EvidenceProvider>
        </div>
      </section>

      <section className="bg-crimson-night text-ivory grain">
        <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-24 md:px-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="label text-ivory/60">What you see in the report</p>
            <ul className="mt-8 space-y-5">
              {f.youSee.map((y, i) => (
                <Reveal key={y} delay={i * 0.08}><li className="flex gap-4 border-b border-ivory/15 pb-5"><span className="font-mono text-xs text-ivory/50">0{i + 1}</span><span className="serif text-2xl">{y}</span></li></Reveal>
              ))}
            </ul>
            <div className="mt-10"><Btn href={`/analyze?sample=${report.profile.id}`} variant="ivory">Open the full analysis <Arrow /></Btn></div>
          </div>
          <div className="flex flex-col gap-px bg-ivory/15">
            {[{ f: next, l: "Next feature" }, { f: prev, l: "Previous feature" }].map(({ f: x, l }) => (
              <Link key={l} href={`/features/${x.slug}`} className="group relative flex flex-1 flex-col justify-between overflow-hidden bg-crimson-night p-8">
                <span className="absolute inset-0 -translate-x-full bg-crimson transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-x-0" />
                <span className="label relative text-ivory/60">{l} · {x.num}</span>
                <span className="relative mt-10 flex items-end justify-between gap-6">
                  <span className="display text-5xl">{x.short}</span>
                  <Arrow className="mb-2 h-6 w-6 transition-transform group-hover:translate-x-2" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

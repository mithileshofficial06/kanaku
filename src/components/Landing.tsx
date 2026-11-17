"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { FEATURES } from "@/lib/features";
import { Arrow, Btn, Counter, EASE, Marquee, Reveal, Rule, SplitChars, SplitWords } from "./motion";
import { Footer, Nav } from "./Nav";

export interface HeroRow { id: string; date: string; narration: string; debit: number; credit: number; balance: number; bad: boolean; expected?: number }
export interface SampleCard { id: string; name: string; city: string; tagline: string; scenario: string; requested: string; headline: string; flags: number; verdict: string }

const inr0 = (n: number) => n ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

// ------------------------------------------------------------------ hero scanner
function Scanner({ rows }: { rows: HeroRow[] }) {
  const [step, setStep] = useState(-1);
  const badIdx = rows.findIndex((r) => r.bad);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s >= rows.length + 5 ? -1 : s + 1)), 520);
    return () => clearInterval(t);
  }, [rows.length]);
  const caught = step >= badIdx && badIdx >= 0;
  const done = step >= rows.length;
  const bad = rows[badIdx];
  return (
    <div className="relative">
      <motion.div initial={{ opacity: 0, y: 60, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: -1.5 }} transition={{ duration: 1.2, delay: 0.5, ease: EASE }}
        className="relative bg-ivory text-ink shadow-[0_40px_80px_-30px_rgba(20,0,4,0.75)]">
        <div className="flex items-start justify-between border-b border-line px-5 pb-3 pt-5">
          <div>
            <p className="text-[13px] font-bold tracking-wide">ARTHAVYA BANK LTD</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted">Statement of account · Sri Lakshmi Traders</p>
          </div>
          <p className="label text-[9px] text-ink-muted">Page 4 of 7</p>
        </div>
        <div className="grid grid-cols-[52px_1fr_80px_86px] gap-2 border-b border-line px-5 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          <span>Row</span><span>Narration</span><span className="text-right">Deposit</span><span className="text-right">Balance</span>
        </div>
        <div className="relative font-mono text-[11px]">
          {rows.map((r, i) => (
            <div key={r.id} className={`relative grid h-[30px] grid-cols-[52px_1fr_80px_86px] items-center gap-2 px-5 transition-colors duration-300 ${caught && r.bad ? "bg-red-soft text-red" : i === step ? "bg-ivory-2" : ""}`}>
              <span className="text-ink-muted">{r.id}</span>
              <span className="truncate">{r.narration}</span>
              <span className={`text-right num ${r.bad ? "font-[Georgia] italic" : ""}`}>{inr0(r.credit)}</span>
              <span className="text-right num">{inr0(r.balance)}</span>
            </div>
          ))}
          {step >= 0 && step < rows.length && (
            <motion.div className="pointer-events-none absolute left-0 right-0 h-[30px] border-y border-crimson/50 bg-crimson/10" animate={{ top: step * 30 }} transition={{ duration: 0.45, ease: EASE }} />
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[10px] uppercase tracking-[0.18em] text-ink-muted">
          <span>Checking: prev + deposit - withdrawal = balance</span>
          <span className="num">{Math.max(0, Math.min(step + 1, rows.length))}/{rows.length}</span>
        </div>
        <AnimatePresence>
          {caught && bad && (
            <motion.div key="stamp" initial={{ opacity: 0, scale: 1.6, rotate: -14 }} animate={{ opacity: 1, scale: 1, rotate: -8 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}
              className="absolute right-6 top-[38%] border-[3px] border-red px-4 py-2 text-red bg-ivory/90">
              <p className="display text-2xl leading-none">Balance chain broken</p>
              <p className="mt-1 font-mono text-[11px] tracking-wide">{bad.id}: expected ₹{inr0(bad.expected ?? 0)}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence>
        {done && (
          <motion.div key="verdict" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.5, ease: EASE }}
            className="absolute -bottom-10 -left-6 border border-ivory/30 bg-crimson-night px-6 py-4 text-ivory shadow-2xl md:-left-12">
            <p className="label text-ivory/60">Verdict</p>
            <p className="display mt-1 text-3xl">Refer to fraud review</p>
            <p className="serif mt-1 text-sm italic text-ivory/80">7 red flags · 0 numbers computed by the AI</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Hero({ rows }: { rows: HeroRow[] }) {
  const { scrollY } = useScroll();
  const yText = useTransform(scrollY, [0, 600], [0, 120]);
  const glow = useTransform(scrollY, [0, 600], [1, 1.25]);
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-crimson text-ivory grain">
      <motion.div style={{ scale: glow }} className="pointer-events-none absolute right-[-10%] top-[10%] h-[80vh] w-[70vw] bg-[radial-gradient(closest-side,rgba(163,20,31,0.9),rgba(121,11,19,0))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,240,220,0.06)_1px,transparent_1px)] bg-[size:120px_100%]" />
      <Nav />
      <div className="relative mx-auto grid max-w-[1400px] items-center gap-16 px-5 pb-28 pt-8 md:px-10 lg:grid-cols-[1.15fr_1fr] lg:pt-14">
        <motion.div style={{ y: yText }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center gap-4">
            <span className="label text-ivory/80">AI credit underwriting · India</span>
            <motion.span initial={{ width: 0 }} animate={{ width: 64 }} transition={{ delay: 0.4, duration: 0.9, ease: EASE }} className="h-px bg-ivory/70" />
          </motion.div>
          <h1 className="mt-6">
            <SplitChars as="span" text="Every rupee" className="display block text-[18vw] lg:text-[9.2vw] xl:text-[150px]" delay={0.2} />
            <SplitChars as="span" text="proven." delay={0.6} className="display block text-[18vw] text-transparent [-webkit-text-stroke:2px_var(--ivory)] lg:text-[9.2vw] xl:text-[150px]" />
          </h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.8, ease: EASE }} className="serif mt-8 max-w-xl text-xl italic leading-snug text-ivory/90 md:text-2xl">
            Upload a bank statement, GST returns and an ITR. Get a loan decision in a minute, with proof for every number and a path to yes for every no.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3, duration: 0.8, ease: EASE }} className="mt-10 flex flex-wrap gap-4">
            <Btn href="/analyze" variant="ivory">Analyze a business <Arrow /></Btn>
            <Btn href="#how" variant="outline-ivory">See how it works</Btn>
          </motion.div>
          <motion.dl initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6, duration: 1 }} className="mt-14 grid max-w-lg grid-cols-3 border-t border-ivory/25 pt-6">
            {[["< 1 min", "per application"], ["0", "numbers computed by AI"], ["7", "fraud checks"]].map(([a, b]) => (
              <div key={b}><dt className="display text-3xl">{a}</dt><dd className="mt-1 text-[11px] uppercase tracking-[0.16em] text-ivory/70">{b}</dd></div>
            ))}
          </motion.dl>
        </motion.div>
        <div className="relative lg:pl-6">
          <Scanner rows={rows} />
        </div>
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex">
        <span className="label text-[10px] text-ivory/60">Scroll</span>
        <motion.span animate={{ scaleY: [0, 1, 0], originY: 0 }} transition={{ duration: 1.8, repeat: Infinity }} className="block h-10 w-px bg-ivory/60" />
      </motion.div>
    </section>
  );
}

// ------------------------------------------------------------------ sections
function Problem() {
  const stats = [
    { n: 998, l: "statement rows read across three sample businesses, exactly" },
    { n: 7, l: "fraud and integrity checks run on every file" },
    { n: 3, l: "documents cross-checked: bank, GST and ITR" },
    { n: 0, l: "numbers computed by the language model" },
  ];
  return (
    <section className="bg-ivory text-ink">
      <div className="mx-auto max-w-[1400px] px-5 py-28 md:px-10">
        <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
          <Reveal><p className="label text-crimson">The problem</p><Rule className="mt-4 w-16 text-crimson" /></Reveal>
          <div>
            <Reveal>
              <h2 className="serif text-[34px] font-medium leading-[1.12] tracking-[-0.01em] md:text-[56px]">
                A loan officer reads <em className="text-crimson">four hundred rows</em> to make one decision. Edited statements slip through, and honest businesses get a flat <em className="text-crimson">no</em>.
              </h2>
            </Reveal>
            <SplitWords className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-muted" text="Kanaku reads the documents, does the maths in code, checks for tampering and fake turnover, and writes a memo where every claim links back to the row it came from." delay={0.2} />
          </div>
        </div>
        <div className="mt-20 grid border-t border-line sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.l} delay={i * 0.1} className="border-b border-line py-8 pr-6 lg:border-b-0 lg:border-r lg:pl-6 lg:first:pl-0 lg:last:border-r-0">
              <Counter to={s.n} className="display text-7xl text-crimson" />
              <p className="mt-3 max-w-[220px] text-sm leading-snug text-ink-muted">{s.l}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pipeline() {
  const nodes = ["PDF documents", "Deterministic parser", "Underwriting engine", "AI writer (NIM)", "Verifier", "Decision + memo"];
  return (
    <div className="relative mt-20 grid grid-cols-2 gap-px bg-crimson/20 md:grid-cols-6">
      {nodes.map((n, i) => (
        <Reveal key={n} delay={i * 0.12} className="relative bg-ivory-2 p-5">
          <p className="font-mono text-[10px] text-crimson">0{i + 1}</p>
          <p className="mt-6 text-sm font-semibold leading-tight">{n}</p>
          <p className="mt-1 text-[11px] text-ink-muted">{i === 3 ? "explains only" : i === 4 ? "checks the AI" : i === 2 ? "all the maths" : i === 1 ? "no AI" : ""}</p>
          {i < nodes.length - 1 && (
            <motion.span className="absolute right-0 top-1/2 z-10 hidden h-2 w-2 -translate-y-1/2 translate-x-1/2 bg-crimson md:block" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.6, delay: i * 0.25, repeat: Infinity }} />
          )}
        </Reveal>
      ))}
    </div>
  );
}

function How() {
  const steps = [
    ["Read", "PDFs become clean tables. Text positions, not guesses: every row keeps its page and line, so it can be highlighted later."],
    ["Calculate", "Income, costs, existing EMIs, bounces and the eligible amount are computed in plain code. Same input, same answer."],
    ["Check", "Every balance is re-added, fonts and file history are inspected, round trips and month-end cash are hunted, and GST, ITR and bank are lined up."],
    ["Explain", "An open model writes the memo from the computed facts. Every citation and every rupee figure it writes is verified before you see it."],
  ];
  return (
    <section id="how" className="bg-ivory-2 text-ink scroll-mt-10">
      <div className="mx-auto max-w-[1400px] px-5 py-28 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <p className="label text-crimson">How it works</p>
            <SplitChars as="h2" text="Four steps. No black box." className="display mt-4 block text-6xl text-crimson md:text-8xl" />
          </div>
          <p className="serif max-w-sm text-lg italic text-ink-muted">The AI reads and explains. Code does every calculation. A verifier checks the AI.</p>
        </div>
        <div className="mt-16 grid gap-px bg-line md:grid-cols-4">
          {steps.map(([t, b], i) => (
            <Reveal key={t} delay={i * 0.12} className="group relative bg-ivory-2 p-8 transition-colors duration-500 hover:bg-crimson hover:text-ivory">
              <span className="display text-[88px] leading-none text-crimson/20 transition-colors group-hover:text-ivory/25">0{i + 1}</span>
              <h3 className="display mt-6 text-4xl">{t}</h3>
              <p className="mt-4 text-[15px] leading-relaxed text-ink-muted transition-colors group-hover:text-ivory/85">{b}</p>
            </Reveal>
          ))}
        </div>
        <Pipeline />
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="bg-crimson text-ivory grain">
      <div className="mx-auto max-w-[1400px] px-5 py-28 md:px-10">
        <p className="label text-ivory/70">Features</p>
        <SplitChars as="h2" text="Seven ways it earns trust." className="display mt-4 block text-6xl md:text-8xl" />
        <div className="mt-16 grid gap-px bg-ivory/15 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.slug} delay={(i % 4) * 0.08} className={i === 0 ? "lg:col-span-2 lg:row-span-2" : ""}>
              <Link href={`/features/${f.slug}`} className="group relative flex h-full min-h-[260px] flex-col justify-between overflow-hidden bg-crimson p-8">
                <span className="absolute inset-0 translate-y-full bg-ivory transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-y-0" />
                <div className="relative flex items-start justify-between transition-colors duration-300 group-hover:text-crimson">
                  <span className="font-mono text-xs">{f.num}</span>
                  <span className="label text-[10px] opacity-70">{f.kicker}</span>
                </div>
                <div className="relative transition-colors duration-300 group-hover:text-crimson">
                  <h3 className={`display ${i === 0 ? "text-6xl md:text-7xl" : "text-4xl"}`}>{f.short}</h3>
                  <p className={`serif mt-3 italic leading-snug opacity-85 ${i === 0 ? "max-w-md text-xl" : "text-[15px]"}`}>{f.lede}</p>
                  <span className="mt-6 inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em]">Explore <Arrow className="transition-transform group-hover:translate-x-1" /></span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Samples({ samples }: { samples: SampleCard[] }) {
  const tone: Record<string, string> = { approve: "bg-forest text-ivory", approve_reduced: "bg-amber text-ivory", refer: "bg-red text-ivory", decline: "bg-ink text-ivory" };
  return (
    <section id="samples" className="bg-ivory text-ink scroll-mt-10">
      <div className="mx-auto max-w-[1400px] px-5 py-28 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <p className="label text-crimson">Try it in one click</p>
            <SplitChars as="h2" text="Three businesses. Three outcomes." className="display mt-4 block text-5xl text-crimson md:text-7xl" />
          </div>
          <p className="max-w-sm text-sm text-ink-muted">Synthetic but realistic: 12 months of statement rows, GST returns and an ITR for each. Nothing is pre-written; the engine runs live.</p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {samples.map((s, i) => (
            <Reveal key={s.id} delay={i * 0.12}>
              <div className="group flex h-full flex-col border border-line bg-ivory transition-all duration-500 hover:-translate-y-1 hover:border-crimson hover:shadow-[0_30px_60px_-30px_rgba(121,11,19,0.45)]">
                <div className="flex items-center justify-between border-b border-line px-6 py-4">
                  <span className="label text-ink-muted">{s.scenario}</span>
                  <span className="font-mono text-xs text-ink-muted">Asks {s.requested}</span>
                </div>
                <div className="flex-1 px-6 py-8">
                  <h3 className="serif text-3xl font-semibold">{s.name}</h3>
                  <p className="mt-1 text-sm text-ink-muted">{s.city}</p>
                  <p className="serif mt-6 text-lg italic leading-snug">&ldquo;{s.tagline}&rdquo;</p>
                </div>
                <div className={`px-6 py-4 ${tone[s.verdict]}`}>
                  <p className="label text-[10px] opacity-80">Kanaku says</p>
                  <p className="display mt-1 text-2xl">{s.headline}</p>
                  <p className="mt-1 text-xs opacity-85">{s.flags ? `${s.flags} finding${s.flags > 1 ? "s" : ""} with evidence` : "No red flags"}</p>
                </div>
                <Link href={`/analyze?sample=${s.id}`} className="flex items-center justify-between bg-crimson px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-ivory transition-colors hover:bg-crimson-night">
                  Open the full analysis <Arrow className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Compare() {
  const rows: [string, boolean, string][] = [
    ["Adds up 400 rows exactly, every time", false, "Code does the maths; the AI never computes"],
    ["Same answer when you run it twice", false, "Deterministic engine"],
    ["Notices an edited statement", false, "Balance chain, font and file-history checks"],
    ["Finds money that leaves and comes back", false, "Round-trip and window-dressing detection"],
    ["Checks GST and ITR against the bank", false, "Three-document cross-check"],
    ["Links every claim to its source row", false, "Verified citations, clickable"],
    ["Tells a rejected owner what to fix", false, "Path to Yes with live sliders"],
  ];
  return (
    <section id="compare" className="bg-crimson-night text-ivory grain scroll-mt-10">
      <div className="mx-auto max-w-[1400px] px-5 py-28 md:px-10">
        <p className="label text-ivory/60">Why not just ask a chatbot?</p>
        <SplitChars as="h2" text="A chatbot guesses. Kanaku proves." className="display mt-4 block text-5xl md:text-7xl" />
        <div className="mt-14 border-t border-ivory/20">
          <div className="grid grid-cols-[1.4fr_0.6fr_1.2fr] gap-4 border-b border-ivory/20 py-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-ivory/60">
            <span>Task</span><span>General chatbot</span><span>Kanaku</span>
          </div>
          {rows.map(([t, , k], i) => (
            <Reveal key={t} delay={i * 0.05}>
              <div className="grid grid-cols-[1.4fr_0.6fr_1.2fr] items-center gap-4 border-b border-ivory/10 py-5">
                <span className="serif text-lg md:text-xl">{t}</span>
                <span className="text-sm text-ivory/45 line-through decoration-ivory/40">Not reliably</span>
                <span className="flex items-center gap-3 text-sm"><span className="h-2 w-2 shrink-0 bg-ivory" />{k}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta() {
  return (
    <section className="relative overflow-hidden bg-crimson text-ivory grain">
      <Marquee className="border-y border-ivory/20 text-ivory/80" items={["Bank statements", "GST returns", "Income tax returns", "Balance-chain check", "Round-trip finder", "Path to Yes", "Verified citations"]} />
      <div className="mx-auto max-w-[1400px] px-5 py-28 md:px-10">
        <SplitChars as="h2" text="Read the statement." className="display block text-[13vw] lg:text-[120px]" />
        <SplitChars as="h2" text="Know the business." delay={0.3} className="display block text-[13vw] text-transparent [-webkit-text-stroke:2px_var(--ivory)] lg:text-[120px]" />
        <div className="mt-12 flex flex-wrap items-center gap-6">
          <Btn href="/analyze" variant="ivory">Start an analysis <Arrow /></Btn>
          <p className="serif text-lg italic text-ivory/80">No sign-up. Three sample businesses ready to open.</p>
        </div>
      </div>
    </section>
  );
}

export default function Landing({ rows, samples }: { rows: HeroRow[]; samples: SampleCard[] }) {
  return (
    <main>
      <Hero rows={rows} />
      <div className="bg-crimson-night text-ivory"><Marquee items={["Repayment capacity", "Path to Yes", "Tamper detection", "Round-tripping", "Window dressing", "GST vs bank vs ITR", "Money-flow map"]} className="text-ivory/85" /></div>
      <Problem />
      <How />
      <Features />
      <Samples samples={samples} />
      <Compare />
      <Cta />
      <Footer />
    </main>
  );
}

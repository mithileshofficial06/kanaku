"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { Arrow, Btn, Counter, EASE, SplitChars, useReady } from "./motion";
import { Nav } from "./Nav";

export interface HeroRow { id: string; date: string; narration: string; debit: number; credit: number; balance: number; bad: boolean; expected?: number }
export interface HeroData {
  rows: HeroRow[];
  roundTrip: { party: string; out: number; back: number; days: number; outId: string; backId: string; count: number };
  gst: { gst: string; bank: string; ratio: string };
  path: { from: string; to: string; requested: string; fromPct: number };
  ticker: string[];
  columns: string[][];
}

const amt = (n: number) => (n ? n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
const WORDS = ["proven.", "traced.", "verified.", "explained."];

// ------------------------------------------------------------ statement scanner (centre of the scene)
function Scanner({ rows, play }: { rows: HeroRow[]; play: boolean }) {
  const [step, setStep] = useState(-1);
  const badIdx = rows.findIndex((r) => r.bad);
  useEffect(() => {
    if (!play) return;
    const t = setInterval(() => setStep((s) => (s >= rows.length + 6 ? -1 : s + 1)), 480);
    return () => clearInterval(t);
  }, [rows.length, play]);
  const caught = badIdx >= 0 && step >= badIdx;
  const bad = rows[badIdx];
  return (
    <div className="relative bg-ivory text-ink shadow-[0_50px_100px_-30px_rgba(20,0,4,0.85)]">
      <div className="flex items-start justify-between border-b border-line px-5 pb-3 pt-4">
        <div>
          <p className="text-[12px] font-bold tracking-wide">ARTHAVYA BANK LTD</p>
          <p className="text-[9px] uppercase tracking-[0.2em] text-ink-muted">Statement of account · Sri Lakshmi Traders</p>
        </div>
        <span className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-crimson">
          <motion.span className="h-1.5 w-1.5 bg-crimson" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1, repeat: Infinity }} />Scanning
        </span>
      </div>
      <div className="grid grid-cols-[46px_1fr_76px_84px] gap-2 border-b border-line px-5 py-2 text-[8.5px] font-bold uppercase tracking-[0.14em] text-ink-muted">
        <span>Row</span><span>Narration</span><span className="text-right">Deposit</span><span className="text-right">Balance</span>
      </div>
      <div className="relative font-mono text-[10.5px]">
        {rows.map((r, i) => (
          <div key={r.id} className={`grid h-[28px] grid-cols-[46px_1fr_76px_84px] items-center gap-2 px-5 transition-colors duration-300 ${caught && r.bad ? "bg-red-soft text-red" : ""}`}>
            <span className="text-ink-muted">{r.id}</span>
            <span className="truncate">{r.narration}</span>
            <span className={`num text-right ${r.bad ? "font-[Georgia] italic" : ""}`}>{amt(r.credit) || (r.debit ? `-${amt(r.debit)}` : "")}</span>
            <span className="num text-right">{amt(r.balance)}</span>
          </div>
        ))}
        {step >= 0 && step < rows.length && (
          <motion.div className="pointer-events-none absolute left-0 right-0 h-[28px] border-y border-crimson/60 bg-crimson/10" animate={{ top: step * 28 }} transition={{ duration: 0.4, ease: EASE }}>
            <span className="absolute -left-2 top-1/2 h-2 w-2 -translate-y-1/2 bg-crimson" />
          </motion.div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-[9px] uppercase tracking-[0.16em] text-ink-muted">
        <span>prev + deposit - withdrawal = balance</span>
        <span className="num">{Math.max(0, Math.min(step + 1, rows.length))}/{rows.length}</span>
      </div>
      <AnimatePresence>
        {caught && bad && (
          <motion.div key="stamp" initial={{ opacity: 0, scale: 1.8, rotate: -16 }} animate={{ opacity: 1, scale: 1, rotate: -7 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3, ease: EASE }}
            className="absolute bottom-12 right-4 border-[3px] border-red bg-ivory/92 px-3 py-1.5 text-red">
            <p className="display text-xl leading-none">Edited row</p>
            <p className="mt-0.5 font-mono text-[10px]">{bad.id} · chain broken</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ------------------------------------------------------------ floating finding cards
function Float({ mx, my, depth, className, delay, children }: { mx: MotionValue<number>; my: MotionValue<number>; depth: number; className: string; delay: number; children: React.ReactNode }) {
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth);
  return (
    <motion.div style={{ x, y }} className={`absolute z-20 ${className}`}>
      <motion.div initial={{ opacity: 0, y: 30, scale: 0.92 }} animate={{ opacity: 1, y: [0, -8, 0], scale: 1 }}
        transition={{ opacity: { duration: 0.8, delay }, scale: { duration: 0.8, delay, ease: EASE }, y: { duration: 5 + depth * 40, repeat: Infinity, ease: "easeInOut", delay } }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

function Scene({ d, play, mx, my }: { d: HeroData; play: boolean; mx: MotionValue<number>; my: MotionValue<number> }) {
  const rx = useTransform(my, [-1, 1], [6, -6]);
  const ry = useTransform(mx, [-1, 1], [-8, 8]);
  const nmx = useTransform(mx, (v) => v * 30), nmy = useTransform(my, (v) => v * 30);
  return (
    <div className="relative mx-auto h-[560px] w-full max-w-[600px] [perspective:1400px]">
      {/* concentric frame squares */}
      {[0, 1, 2].map((i) => (
        <motion.div key={i} className="absolute border border-ivory/15" style={{ inset: `${8 + i * 9}%` }} initial={{ opacity: 0, scale: 0.85 }} animate={play ? { opacity: 1, scale: 1, rotate: i % 2 ? 3 : -3 } : {}} transition={{ duration: 1.4, delay: 0.1 * i, ease: EASE }} />
      ))}
      {/* connector lines from cards to the document */}
      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 620 620" fill="none" aria-hidden>
        {["M70 120 L200 230", "M560 150 L430 240", "M80 520 L210 430", "M560 500 L420 420"].map((p, i) => (
          <motion.path key={p} d={p} stroke="var(--ivory)" strokeOpacity={0.35} strokeDasharray="3 5" initial={{ pathLength: 0 }} animate={play ? { pathLength: 1 } : {}} transition={{ duration: 1, delay: 1 + i * 0.15 }} />
        ))}
      </svg>
      <motion.div style={{ rotateX: rx, rotateY: ry, x: nmx, y: nmy }} initial={{ opacity: 0, y: 80 }} animate={play ? { opacity: 1, y: 0 } : {}} transition={{ duration: 1.2, ease: EASE }}
        className="absolute left-1/2 top-1/2 z-10 w-[86%] max-w-[480px] -translate-x-1/2 -translate-y-1/2 [transform-style:preserve-3d]">
        <Scanner rows={d.rows} play={play} />
      </motion.div>

      {play && (
        <>
          <Float mx={mx} my={my} depth={-14} delay={1.2} className="left-0 top-[2%] hidden w-[210px] md:block">
            <div className="border border-ivory/25 bg-crimson-night/95 p-4 text-ivory backdrop-blur">
              <p className="label text-[9px] text-ivory/60">Round trip · {d.roundTrip.count} found</p>
              <div className="mt-3 flex items-center justify-between font-mono text-[11px]">
                <span>-{(d.roundTrip.out / 1e5).toFixed(2)}L</span>
                <svg width="60" height="14" viewBox="0 0 60 14" aria-hidden><motion.path d="M2 7h52M48 2l6 5-6 5" stroke="var(--ivory)" strokeWidth="1.4" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 1] }} transition={{ duration: 2.2, repeat: Infinity }} /></svg>
                <span className="text-[#ff9b93]">+{(d.roundTrip.back / 1e5).toFixed(2)}L</span>
              </div>
              <p className="serif mt-2 text-[13px] italic text-ivory/80">{d.roundTrip.party}, back in {d.roundTrip.days} days</p>
            </div>
          </Float>
          <Float mx={mx} my={my} depth={18} delay={1.4} className="right-0 top-[6%] hidden w-[200px] md:block">
            <div className="bg-ivory p-4 text-ink shadow-2xl">
              <p className="label text-[9px] text-crimson">GST vs bank</p>
              <p className="display mt-1 text-4xl text-crimson">{d.gst.ratio}</p>
              {[["GST", 100, d.gst.gst], ["Bank", 17, d.gst.bank]].map(([l, w, v], i) => (
                <div key={l as string} className="mt-2">
                  <div className="flex justify-between text-[10px] text-ink-muted"><span>{l}</span><span className="font-mono">{v}</span></div>
                  <div className="mt-1 h-1.5 bg-ivory-3"><motion.div className={i ? "h-full bg-forest" : "h-full bg-crimson"} initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ duration: 1.2, delay: 1.8 + i * 0.2, ease: EASE }} /></div>
                </div>
              ))}
            </div>
          </Float>
          <Float mx={mx} my={my} depth={-20} delay={1.6} className="bottom-[2%] left-[2%] hidden w-[236px] md:block">
            <div className="bg-red p-4 text-ivory shadow-2xl">
              <p className="label text-[9px] text-ivory/70">Verdict</p>
              <p className="display mt-1 text-[24px] leading-[1.02]">Refer to fraud review</p>
              <p className="mt-2 text-[11px] text-ivory/85">7 red flags · every one with evidence</p>
            </div>
          </Float>
          <Float mx={mx} my={my} depth={12} delay={1.8} className="bottom-[6%] right-0 hidden w-[210px] md:block">
            <div className="border border-forest/40 bg-ivory p-4 text-ink shadow-2xl">
              <p className="label text-[9px] text-forest">Path to Yes · another file</p>
              <p className="mt-1 font-mono text-[11px] text-ink-muted">{d.path.from} today</p>
              <p className="display text-3xl text-forest">{d.path.to}</p>
              <div className="mt-2 h-1.5 bg-ivory-3"><motion.div className="h-full bg-forest" initial={{ width: `${d.path.fromPct}%` }} animate={{ width: ["25%", "100%", "100%"] }} transition={{ duration: 3, repeat: Infinity, ease: EASE }} /></div>
              <p className="mt-1 text-[10px] text-ink-muted">asked {d.path.requested} · 4 steps</p>
            </div>
          </Float>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------ background: scrolling rupee columns
function DigitRain({ columns }: { columns: string[][] }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex justify-between overflow-hidden px-4 opacity-[0.06] [mask-image:linear-gradient(to_right,transparent_0%,transparent_42%,black_75%)]" aria-hidden>
      {columns.map((col, i) => (
        <motion.div key={i} className="flex flex-col gap-3 font-mono text-[12px] leading-none" animate={{ y: i % 2 ? ["-50%", "0%"] : ["0%", "-50%"] }} transition={{ duration: 40 + i * 6, repeat: Infinity, ease: "linear" }}>
          {[...col, ...col].map((v, j) => <span key={j}>{v}</span>)}
        </motion.div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ hero
export function Hero({ d }: { d: HeroData }) {
  const ready = useReady();
  const mx = useSpring(useMotionValue(0), { stiffness: 60, damping: 18 });
  const my = useSpring(useMotionValue(0), { stiffness: 60, damping: 18 });
  const px = useMotionValue(50), py = useMotionValue(40);
  const spot = useMotionTemplate`radial-gradient(600px circle at ${px}% ${py}%, rgba(196,30,45,0.55), transparent 65%)`;
  const { scrollY } = useScroll();
  const yText = useTransform(scrollY, [0, 700], [0, 140]);
  const markX = useTransform(scrollY, [0, 700], ["0%", "-12%"]);
  const [w, setW] = useState(0);
  useEffect(() => { if (!ready) return; const t = setInterval(() => setW((x) => (x + 1) % WORDS.length), 2200); return () => clearInterval(t); }, [ready]);

  return (
    <section
      className="relative min-h-[100svh] overflow-hidden bg-crimson text-ivory grain"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
        mx.set(fx * 2 - 1); my.set(fy * 2 - 1); px.set(fx * 100); py.set(fy * 100);
      }}
    >
      <motion.div className="pointer-events-none absolute inset-0" style={{ background: spot }} />
      <DigitRain columns={d.columns} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,240,220,0.05)_1px,transparent_1px)] bg-[size:100%_56px]" />
      <motion.p style={{ x: markX }} className="display pointer-events-none absolute -bottom-[0.18em] left-0 select-none whitespace-nowrap text-[30vw] leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,240,220,0.12)]" aria-hidden>
        Kanaku · Kanakku
      </motion.p>

      <Nav />
      <div className="relative mx-auto grid max-w-[1440px] items-center gap-6 px-5 pb-24 pt-0 md:px-10 lg:grid-cols-[1.05fr_1fr] lg:pt-2">
        <motion.div style={{ y: yText }} className="relative z-10">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={ready ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.8, ease: EASE }} className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 border border-ivory/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]">
              <motion.span className="h-1.5 w-1.5 bg-ivory" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />AI credit underwriting
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ivory/70">for India&apos;s small businesses</span>
          </motion.div>

          <h1 className="mt-6" aria-label={`Every rupee ${WORDS[0]}`}>
            <SplitChars play={ready} text="Every rupee" delay={0.1} stagger={0.04} className="display block text-[19vw] leading-[0.86] lg:text-[8.6vw] xl:text-[132px]" />
            <span className="relative mt-2 block h-[1.08em] overflow-hidden text-[16vw] lg:text-[7.4vw] xl:text-[112px]" aria-hidden>
              <AnimatePresence mode="popLayout">
                {ready && (
                  <motion.span key={w} initial={{ y: "100%", opacity: 0 }} animate={{ y: "0%", opacity: 1 }} exit={{ y: "-100%", opacity: 0 }} transition={{ duration: 0.7, ease: EASE }}
                    className="serif absolute left-0 top-0 block italic leading-[1.02] tracking-[-0.03em] text-ivory">
                    {WORDS[w]}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            <motion.span className="mt-3 block h-[3px] origin-left bg-ivory" initial={{ scaleX: 0 }} animate={ready ? { scaleX: 1 } : {}} transition={{ duration: 1.2, delay: 0.7, ease: EASE }} style={{ width: "min(420px, 70%)" }} />
          </h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={ready ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.8, duration: 0.8, ease: EASE }} className="mt-8 max-w-xl text-lg leading-relaxed text-ivory/90 md:text-xl">
            Upload a bank statement, GST returns and an ITR. Kanaku decides how much a small business can safely borrow, <span className="serif italic">catches edited statements and fake turnover</span>, and shows the owner a path to yes.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={ready ? { opacity: 1, y: 0 } : {}} transition={{ delay: 1, duration: 0.8, ease: EASE }} className="mt-10 flex flex-wrap gap-4">
            <Btn href="/analyze" variant="ivory">Analyze a business <Arrow /></Btn>
            <Btn href="/analyze?sample=sri-lakshmi-traders" variant="outline-ivory">Watch it catch a fraud</Btn>
          </motion.div>
          <motion.dl initial={{ opacity: 0 }} animate={ready ? { opacity: 1 } : {}} transition={{ delay: 1.3, duration: 1 }} className="mt-10 grid max-w-xl grid-cols-3 border-t border-ivory/25">
            {[[1, " min", "to a decision"], [0, "", "numbers computed by AI"], [7, "", "fraud checks per file"]].map(([n, suf, l], i) => (
              <div key={l as string} className={`pt-5 ${i ? "border-l border-ivory/20 pl-4 md:pl-6" : "pr-3"}`}>
                <dt className="display text-3xl md:text-5xl">{i === 0 && "<"}{ready ? <Counter to={n as number} /> : 0}{suf}</dt>
                <dd className="mt-1 text-[10px] uppercase leading-snug tracking-[0.14em] text-ivory/70 md:text-[11px]">{l}</dd>
              </div>
            ))}
          </motion.dl>
        </motion.div>

        <div className="relative z-10 mt-6 lg:mt-0">
          <Scene d={d} play={ready} mx={mx} my={my} />
        </div>
      </div>

      {/* findings ticker */}
      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-ivory/20 bg-crimson-night/80 backdrop-blur">
        <div className="overflow-hidden">
          <motion.div className="flex w-max gap-10 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-ivory/85" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 45, repeat: Infinity, ease: "linear" }}>
            {[...d.ticker, ...d.ticker].map((t, i) => <span key={i} className="flex items-center gap-10 whitespace-nowrap">{t}<span className="h-1.5 w-1.5 bg-ivory/60" /></span>)}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

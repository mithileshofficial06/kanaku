"use client";
import { useMemo, useState } from "react";
import { animate, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { eligibility, type EligibilityInput, type Levers, type PathToYes as Path } from "@/lib/engine/whatif";
import { lakh } from "@/lib/format";
import { EASE } from "../motion";

function Live({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  useEffect(() => {
    const c = animate(prev.current, value, { duration: 0.6, ease: EASE, onUpdate: (v) => { if (ref.current) ref.current.textContent = lakh(Math.round(v / 1000) * 1000); } });
    prev.current = value;
    return () => c.stop();
  }, [value]);
  return <span ref={ref}>{lakh(value)}</span>;
}

export function PathToYes({ input, path, compact = false }: { input: EligibilityInput; path: Path; compact?: boolean }) {
  const base: Levers = { cashToDigitalPct: 0, closedLoans: [], cleanMonths: 0, tenureMonths: input.tenureMonths };
  const [lv, setLv] = useState<Levers>(base);
  const e = useMemo(() => eligibility(input, lv), [input, lv]);
  const reached = e.eligible >= input.requested;
  const pct = Math.min(100, (e.eligible / input.requested) * 100);
  const hasBounces = input.bounceMonths.some((m) => m < 6);
  const set = (p: Partial<Levers>) => setLv((l) => ({ ...l, ...p }));
  const applyStep = (i: number) => setLv(path.steps[i].levers as Levers);

  return (
    <div className={`grid gap-10 ${compact ? "" : "lg:grid-cols-[1.1fr_1fr]"}`}>
      <div>
        <div className={`p-8 transition-colors duration-500 ${reached ? "bg-forest text-ivory" : "bg-crimson text-ivory"}`}>
          <p className="label text-ivory/70">{reached ? "Request covered" : "Eligible right now"}</p>
          <p className="display mt-2 text-7xl md:text-8xl"><Live value={e.eligible} /></p>
          <p className="serif mt-2 text-lg italic text-ivory/85">of {lakh(input.requested)} requested · EMI about {lakh(Math.round(e.emiOnEligible))} for {lv.tenureMonths} months</p>
          <div className="mt-6 h-2 bg-ivory/20"><motion.div className="h-full bg-ivory" animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: EASE }} /></div>
          <p className="mt-2 text-xs text-ivory/75">Limited by {e.binding}{e.bounceFactor < 1 ? ` · bounce penalty x${e.bounceFactor}` : ""}</p>
        </div>
        <div className="mt-6 space-y-6">
          {input.avgCash > 0 && (
            <label className="block">
              <span className="flex justify-between text-sm font-semibold"><span>Cash sales moved to UPI or bank</span><span className="num text-crimson">{lv.cashToDigitalPct}%</span></span>
              <input type="range" min={0} max={100} step={10} value={lv.cashToDigitalPct} onChange={(ev) => set({ cashToDigitalPct: +ev.target.value })} className="mt-2 w-full" />
              <span className="text-xs text-ink-muted">Traceable sales raise the verified turnover that caps the loan.</span>
            </label>
          )}
          {hasBounces && (
            <label className="block">
              <span className="flex justify-between text-sm font-semibold"><span>Bounce-free months from now</span><span className="num text-crimson">{lv.cleanMonths}</span></span>
              <input type="range" min={0} max={6} step={1} value={lv.cleanMonths} onChange={(ev) => set({ cleanMonths: +ev.target.value })} className="mt-2 w-full" />
              <span className="text-xs text-ink-muted">Old bounces drop out of the 6-month review window.</span>
            </label>
          )}
          <label className="block">
            <span className="flex justify-between text-sm font-semibold"><span>Loan tenure</span><span className="num text-crimson">{lv.tenureMonths} months</span></span>
            <input type="range" min={12} max={60} step={6} value={lv.tenureMonths} onChange={(ev) => set({ tenureMonths: +ev.target.value })} className="mt-2 w-full" />
            <span className="text-xs text-ink-muted">Longer tenure means a smaller EMI for the same amount.</span>
          </label>
          {input.loans.length > 0 && (
            <div>
              <p className="text-sm font-semibold">Close an existing loan</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {input.loans.map((l) => {
                  const on = lv.closedLoans.includes(l.ref);
                  return <button key={l.ref} onClick={() => set({ closedLoans: on ? lv.closedLoans.filter((x) => x !== l.ref) : [...lv.closedLoans, l.ref] })} className={`border px-3 py-2 text-left text-xs transition-colors ${on ? "border-crimson bg-crimson text-ivory" : "border-line hover:border-crimson"}`}><span className="font-semibold">{l.lender}</span><span className="block opacity-75">EMI ₹{Math.round(l.emi).toLocaleString("en-IN")}{on ? " · closed" : ""}</span></button>;
                })}
              </div>
            </div>
          )}
          <button onClick={() => setLv(base)} className="label text-[10px] text-ink-muted underline">Reset to today</button>
        </div>
      </div>
      <div>
        <p className="label text-crimson">Suggested plan</p>
        {path.steps.length === 0 ? (
          <p className="serif mt-4 text-xl italic">{path.baseline >= path.requested ? "Nothing to change: the request is already within capacity." : "No realistic change reaches the request. A smaller amount is the honest answer."}</p>
        ) : (
          <ol className="mt-4 border-t border-line">
            {path.steps.map((s, i) => (
              <motion.li key={s.lever} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.6, ease: EASE }} className="grid grid-cols-[48px_1fr_auto] gap-4 border-b border-line py-5">
                <span className="display text-4xl text-crimson/30">0{i + 1}</span>
                <div>
                  <p className="serif text-lg font-semibold">{s.lever}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{s.detail}</p>
                  <button onClick={() => applyStep(i)} className="label mt-3 text-[10px] text-crimson underline underline-offset-4">Apply up to this step</button>
                </div>
                <p className="display text-2xl text-forest">+{lakh(s.gain)}</p>
              </motion.li>
            ))}
          </ol>
        )}
        {path.steps.length > 0 && (
          <div className={`mt-6 p-5 ${path.reachable ? "bg-forest-soft text-forest" : "bg-amber-soft text-amber"}`}>
            <p className="display text-2xl">{path.reachable ? `Reaches ${lakh(path.combined)}` : `Best case ${lakh(path.combined)}`}</p>
            <p className="mt-1 text-sm">{path.reachable ? `Covers the ${lakh(path.requested)} requested.` : `Still short of the ${lakh(path.requested)} requested.`}</p>
          </div>
        )}
      </div>
    </div>
  );
}

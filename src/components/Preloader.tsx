"use client";
// Intro: counter 000 -> 100, wordmark rises, status lines cycle, then a split curtain reveals the page.
import { useEffect, useState } from "react";
import { animate, AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EASE } from "./motion";

const LINES = ["Reading the statement", "Re-adding every balance", "Matching money out to money back", "Lining up bank, GST and ITR", "Verifying every figure"];
const WORD = "KANAKU";

function markReady() {
  document.documentElement.dataset.ready = "1";
  window.dispatchEvent(new Event("kanaku:ready"));
}

export default function Preloader() {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(true);
  const [n, setN] = useState(0);
  const [line, setLine] = useState(0);

  useEffect(() => {
    if (reduce) { setShow(false); markReady(); return; }
    document.documentElement.style.overflow = "hidden";
    const c = animate(0, 100, { duration: 2.4, ease: [0.65, 0, 0.35, 1], onUpdate: (v) => setN(Math.round(v)) });
    const t = setInterval(() => setLine((l) => Math.min(l + 1, LINES.length - 1)), 480);
    const done = setTimeout(() => {
      setShow(false);
      document.documentElement.style.overflow = "";
      setTimeout(markReady, 350);
    }, 2900);
    return () => { c.stop(); clearInterval(t); clearTimeout(done); document.documentElement.style.overflow = ""; };
  }, [reduce]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div key="pre" className="fixed inset-0 z-[100] text-ivory" aria-label="Loading Kanaku" role="status">
          {/* two curtain halves */}
          <motion.div className="absolute inset-x-0 top-0 h-1/2 bg-crimson grain" exit={{ y: "-100%" }} transition={{ duration: 0.9, ease: EASE }} />
          <motion.div className="absolute inset-x-0 bottom-0 h-1/2 bg-crimson grain" exit={{ y: "100%" }} transition={{ duration: 0.9, ease: EASE }} />
          <motion.div className="absolute inset-0" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            {/* ledger lines drawing in */}
            {[18, 34, 50, 66, 82].map((top, i) => (
              <motion.div key={top} className="absolute left-0 right-0 h-px origin-left bg-ivory/15" style={{ top: `${top}%` }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.4, delay: i * 0.12, ease: EASE }} />
            ))}
            <div className="absolute left-5 right-5 top-6 flex items-center justify-between md:left-10 md:right-10">
              <span className="label text-ivory/70">Kanaku · AI credit underwriting</span>
              <span className="label text-ivory/70">Arthaton 2026</span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <h1 className="display flex overflow-hidden text-[22vw] leading-[0.85] md:text-[16vw]" aria-hidden>
                {[...WORD].map((ch, i) => (
                  <motion.span key={i} className="inline-block" initial={{ y: "110%" }} animate={{ y: "0%" }} transition={{ duration: 1, delay: 0.15 + i * 0.07, ease: EASE }}>{ch}</motion.span>
                ))}
              </h1>
            </div>
            <div className="absolute bottom-6 left-5 right-5 md:bottom-10 md:left-10 md:right-10">
              <div className="flex items-end justify-between gap-6">
                <div className="h-6 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.p key={line} initial={{ y: 24 }} animate={{ y: 0 }} exit={{ y: -24 }} transition={{ duration: 0.3, ease: EASE }} className="serif text-lg italic text-ivory/85">{LINES[line]}...</motion.p>
                  </AnimatePresence>
                </div>
                <p className="display num text-7xl leading-none md:text-9xl">{String(n).padStart(3, "0")}</p>
              </div>
              <div className="mt-4 h-[3px] bg-ivory/15"><div className="h-full bg-ivory" style={{ width: `${n}%` }} /></div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

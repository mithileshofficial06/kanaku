"use client";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FEATURES } from "@/lib/features";
import { Arrow } from "./motion";

export function Logo({ tone = "ivory" }: { tone?: "ivory" | "crimson" }) {
  return (
    <Link href="/" className={`flex items-center gap-3 ${tone === "ivory" ? "text-ivory" : "text-crimson"}`} aria-label="Kanaku home">
      <span className="grid grid-cols-2 gap-[3px]" aria-hidden>
        {[0, 1, 2, 3].map((i) => <span key={i} className="block h-[7px] w-[7px] bg-current" />)}
      </span>
      <span className="display text-[22px] tracking-[0.04em]">Kanaku</span>
    </Link>
  );
}

export function Nav({ tone = "ivory" }: { tone?: "ivory" | "crimson" }) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const c = tone === "ivory" ? "text-ivory" : "text-crimson";
  return (
    <header className={`relative z-40 ${c}`}>
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-6 md:px-10">
        <Logo tone={tone} />
        <nav className="hidden items-center gap-10 text-[11px] font-semibold uppercase tracking-[0.22em] md:flex">
          <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
            <button className="py-2 uppercase tracking-[0.22em] opacity-90 hover:opacity-100" aria-expanded={open}>Features</button>
            <AnimatePresence>
              {open && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.25 }} className="absolute left-1/2 top-full w-[340px] -translate-x-1/2 border border-crimson/20 bg-ivory p-2 text-crimson shadow-[0_24px_60px_-20px_rgba(51,4,10,0.45)]">
                  {FEATURES.map((f) => (
                    <Link key={f.slug} href={`/features/${f.slug}`} className="group flex items-baseline justify-between gap-4 px-4 py-3 hover:bg-crimson hover:text-ivory">
                      <span className="display text-lg normal-case tracking-normal">{f.short}</span>
                      <span className="text-[10px] tracking-[0.18em] opacity-70">{f.num}</span>
                    </Link>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Link href="/#how" className="opacity-90 hover:opacity-100">How it works</Link>
          <Link href="/#samples" className="opacity-90 hover:opacity-100">Samples</Link>
          <Link href="/#compare" className="opacity-90 hover:opacity-100">Why not a chatbot</Link>
        </nav>
        <Link href="/analyze" className={`hidden items-center gap-3 border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] md:flex ${tone === "ivory" ? "border-ivory/70 hover:bg-ivory hover:text-crimson" : "border-crimson hover:bg-crimson hover:text-ivory"} transition-colors`}>
          Open app <Arrow />
        </Link>
        <button className="md:hidden label" onClick={() => setMenu(!menu)} aria-expanded={menu}>{menu ? "Close" : "Menu"}</button>
      </div>
      <AnimatePresence>
        {menu && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden bg-crimson-night text-ivory md:hidden">
            <div className="flex flex-col gap-1 px-5 py-4">
              {FEATURES.map((f) => <Link key={f.slug} href={`/features/${f.slug}`} className="display py-2 text-2xl" onClick={() => setMenu(false)}>{f.short}</Link>)}
              <Link href="/analyze" className="label mt-3 border border-ivory/60 px-4 py-3 text-center">Open app</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-crimson-night text-ivory grain">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-16 md:grid-cols-[1.4fr_1fr_1fr] md:px-10">
        <div>
          <Logo />
          <p className="serif mt-6 max-w-sm text-lg italic text-ivory/80">Kanakku (Tamil): accounts, the calculation. A credit underwriter that shows its working.</p>
        </div>
        <div>
          <p className="label text-ivory/60">Features</p>
          <ul className="mt-4 space-y-2 text-sm">
            {FEATURES.map((f) => <li key={f.slug}><Link className="hover:underline" href={`/features/${f.slug}`}>{f.short}</Link></li>)}
          </ul>
        </div>
        <div className="text-sm text-ivory/80">
          <p className="label text-ivory/60">About</p>
          <p className="mt-4">Built for Arthaton 2026 (AI for Finance).</p>
          <p className="mt-2">All sample data is synthetic. Banks, lenders and people are fictional.</p>
          <p className="mt-2">Decision support only. Not a lending decision.</p>
          <p className="mt-2">AI: open models on NVIDIA NIM. Maths: deterministic TypeScript.</p>
        </div>
      </div>
    </footer>
  );
}

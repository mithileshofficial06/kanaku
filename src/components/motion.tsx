"use client";
// Shared animation primitives. Everything respects prefers-reduced-motion via motion's defaults.
import { animate, motion, useInView, useReducedMotion, type Variants } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Fade + rise when scrolled into view. */
export function Reveal({ children, delay = 0, y = 28, className = "" }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.8, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

/** Headline that rises in character by character from a clipped baseline. */
export function SplitChars({ text, className = "", delay = 0, stagger = 0.035, as = "span" }: { text: string; className?: string; delay?: number; stagger?: number; as?: "span" | "h1" | "h2" }) {
  const Tag = motion[as];
  const words = text.split(" ");
  let i = 0;
  return (
    <Tag className={className} initial="hidden" whileInView="show" viewport={{ once: true }} aria-label={text}>
      {words.map((w, wi) => (
        <span key={wi} className="inline-block overflow-hidden whitespace-nowrap align-bottom pb-[0.06em]" aria-hidden>
          {[...w].map((ch) => {
            const d = delay + i++ * stagger;
            return (
              <motion.span key={d} className="inline-block" variants={{ hidden: { y: "105%" }, show: { y: "0%", transition: { duration: 0.9, delay: d, ease: EASE } } }}>
                {ch}
              </motion.span>
            );
          })}
          {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </Tag>
  );
}

/** Paragraph that fades in word by word. */
export function SplitWords({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  const v: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.025, delayChildren: delay } } };
  return (
    <motion.p className={className} variants={v} initial="hidden" whileInView="show" viewport={{ once: true }}>
      {text.split(" ").map((w, i) => (
        <motion.span key={i} className="inline-block mr-[0.28em]" variants={{ hidden: { opacity: 0, y: 8, filter: "blur(4px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: EASE } } }}>
          {w}
        </motion.span>
      ))}
    </motion.p>
  );
}

/** Number that counts up when visible. */
export function Counter({ to, format = (n: number) => Math.round(n).toLocaleString("en-IN"), duration = 1.6, className = "" }: { to: number; format?: (n: number) => string; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? to : 0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) { setV(to); return; }
    const c = animate(0, to, { duration, ease: EASE, onUpdate: setV });
    return () => c.stop();
  }, [inView, to, duration, reduce]);
  return <span ref={ref} className={`num ${className}`}>{format(v)}</span>;
}

export function Marquee({ items, className = "" }: { items: string[]; className?: string }) {
  const row = [...items, ...items];
  return (
    <div className={`overflow-hidden ${className}`} aria-hidden>
      <motion.div className="flex w-max gap-12 py-4" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 38, ease: "linear", repeat: Infinity }}>
        {row.map((t, i) => (
          <span key={i} className="display text-2xl md:text-3xl flex items-center gap-12 whitespace-nowrap">
            {t}<span className="inline-block w-2 h-2 bg-current opacity-60" />
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
    </svg>
  );
}

/** Square button with a fill that sweeps in on hover. */
export function Btn({ href, onClick, children, variant = "ivory", className = "", type = "button", disabled }: { href?: string; onClick?: () => void; children: ReactNode; variant?: "ivory" | "crimson" | "outline-ivory" | "outline-crimson"; className?: string; type?: "button" | "submit"; disabled?: boolean }) {
  const styles = {
    ivory: "bg-ivory text-crimson border-ivory",
    crimson: "bg-crimson text-ivory border-crimson",
    "outline-ivory": "bg-transparent text-ivory border-ivory/70",
    "outline-crimson": "bg-transparent text-crimson border-crimson",
  }[variant];
  const sweep = variant === "ivory" || variant === "outline-crimson" ? "bg-crimson-night" : "bg-ivory";
  const hoverText = variant === "ivory" || variant === "outline-crimson" ? "group-hover:text-ivory" : "group-hover:text-crimson";
  const inner = (
    <span className={`group relative inline-flex items-center gap-3 overflow-hidden border px-6 py-3.5 text-[13px] font-semibold uppercase tracking-[0.16em] transition-colors ${styles} ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`}>
      <span className={`absolute inset-0 -translate-x-[101%] transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-x-0 ${sweep}`} />
      <span className={`relative flex items-center gap-3 transition-colors duration-300 ${hoverText}`}>{children}</span>
    </span>
  );
  if (href) return <Link href={href} className="inline-block">{inner}</Link>;
  return <button type={type} onClick={onClick} disabled={disabled} className="inline-block text-left">{inner}</button>;
}

/** Thin rule that draws itself across. */
export function Rule({ className = "", delay = 0 }: { className?: string; delay?: number }) {
  return <motion.div className={`h-px origin-left bg-current ${className}`} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 1.1, delay, ease: EASE }} />;
}

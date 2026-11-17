"use client";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Report } from "@/lib/engine/analyze";
import type { Verified } from "@/lib/llm";
import { EASE } from "../motion";
import { Chip, tagToEvidence } from "./Evidence";

const FIG = /(₹\s?[\d,]+(?:\.\d+)?\s?(?:L|lakh|lakhs|Cr|crore|k)?\b)/gi;

/** Renders memo text: "## " headings, "- " bullets, **bold**, [R12] chips, unverified figures marked. */
function Inline({ text, v }: { text: string; v: Verified }) {
  const bad = new Set(v.figures.filter((f) => !f.verified).map((f) => f.text.replace(/\s/g, "")));
  const valid = new Map(v.citations.map((c) => [c.tag, c.valid]));
  const out: ReactNode[] = [];
  text.split(/(\[[^\]]+\]|\*\*[^*]+\*\*)/g).forEach((part, i) => {
    if (/^\[[^\]]+\]$/.test(part)) {
      part.slice(1, -1).split(/,\s*/).forEach((tag, j) => out.push(<Chip key={`${i}-${j}`} ev={tagToEvidence(tag.trim())} label={tag.trim()} invalid={valid.get(tag.trim()) === false} />));
    } else if (/^\*\*/.test(part)) out.push(<strong key={i} className="font-semibold text-ink">{part.slice(2, -2)}</strong>);
    else part.split(FIG).forEach((s, j) => out.push(bad.has(s.replace(/\s/g, "")) ? <mark key={`${i}f${j}`} title="This figure does not match any computed value" className="bg-red-soft px-0.5 text-red underline decoration-wavy">{s}</mark> : <Fragment key={`${i}f${j}`}>{s}</Fragment>));
  });
  return <>{out}</>;
}

export function MemoBody({ v }: { v: Verified }) {
  const lines = v.text.split("\n").filter((l) => l.trim());
  return (
    <div className="space-y-2">
      {lines.map((l, i) => {
        const t = l.trim();
        if (t.startsWith("#")) return <motion.h4 key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="display pt-5 text-2xl text-crimson first:pt-0">{t.replace(/^#+\s*/, "")}</motion.h4>;
        const bullet = /^[-*•]\s/.test(t);
        return (
          <motion.p key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className={`text-[15px] leading-relaxed text-ink/90 ${bullet ? "relative pl-5" : ""}`}>
            {bullet && <span className="absolute left-0 top-[0.6em] h-1.5 w-1.5 bg-crimson" />}
            <Inline text={bullet ? t.replace(/^[-*•]\s/, "") : t} v={v} />
          </motion.p>
        );
      })}
    </div>
  );
}

export function VerifyBadge({ v }: { v: Verified }) {
  const figOk = v.figures.filter((f) => f.verified).length, figAll = v.figures.length;
  const citeOk = v.citations.filter((c) => c.valid).length, citeAll = v.citations.length;
  const clean = figOk === figAll && citeOk === citeAll;
  return (
    <div className={`grid grid-cols-2 gap-px ${clean ? "bg-forest/30" : "bg-red/30"}`}>
      <div className={`p-4 ${clean ? "bg-forest-soft" : "bg-red-soft"}`}><p className="display text-3xl">{figOk}/{figAll}</p><p className="text-[11px] uppercase tracking-[0.14em]">figures match computed facts</p></div>
      <div className={`p-4 ${clean ? "bg-forest-soft" : "bg-red-soft"}`}><p className="display text-3xl">{citeOk}/{citeAll}</p><p className="text-[11px] uppercase tracking-[0.14em]">citations found in documents</p></div>
    </div>
  );
}

export function Memo({ report }: { report: Report }) {
  const [v, setV] = useState<Verified | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let dead = false;
    setV(null);
    fetch("/api/memo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ report }) })
      .then((r) => r.json()).then((d) => { if (dead) return; if (d.error) setErr(d.error); else setV(d); }).catch(() => !dead && setErr("Could not write the memo."));
    return () => { dead = true; };
  }, [report]);
  if (err) return <p className="text-red">{err}</p>;
  if (!v) return (
    <div className="space-y-3" aria-busy>
      <p className="label text-crimson">Writing the memo from computed facts...</p>
      {[90, 75, 82, 60, 88, 70].map((w, i) => <motion.div key={i} className="h-4 bg-ivory-3" style={{ width: `${w}%` }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }} />)}
    </div>
  );
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
      <MemoBody v={v} />
      <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
        <VerifyBadge v={v} />
        <p className="text-xs leading-relaxed text-ink-muted">
          {v.source === "llm" ? <>Written by <span className="font-mono">{v.model}</span> on NVIDIA NIM from the engine&apos;s facts. Every figure and citation was checked before display.</> : <>Template memo generated from the engine&apos;s facts (no LLM key configured). Same verification applies.</>}
        </p>
        <p className="text-xs leading-relaxed text-ink-muted">Click any citation chip to open the original statement with that row highlighted.</p>
      </aside>
    </div>
  );
}

export function Ask({ report }: { report: Report }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<{ q: string; v?: Verified; err?: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const suggestions = report.decision.verdict === "refer"
    ? ["Why was this file referred?", "Explain the round-tripping", "Which row was edited?"]
    : report.decision.verdict === "approve" ? ["Which EMIs did you find?", "How was the amount calculated?", "Any risks to watch?"]
    : ["Why not the full amount?", "Which EMIs did you find?", "Tell me about the bounces"];
  const ask = async (question: string) => {
    if (!question.trim() || busy) return;
    setBusy(true); setQ("");
    setItems((x) => [{ q: question }, ...x]);
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ report, question }) });
      const d = await r.json();
      setItems((x) => [{ q: question, ...(d.error ? { err: d.error } : { v: d }) }, ...x.slice(1)]);
    } catch { setItems((x) => [{ q: question, err: "Could not reach the server." }, ...x.slice(1)]); }
    setBusy(false);
  };
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex border border-crimson">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about this file, e.g. why not the full amount?" className="flex-1 bg-ivory px-4 py-4 text-[15px] placeholder:text-ink-muted/70" />
        <button disabled={busy} className="bg-crimson px-6 text-[12px] font-semibold uppercase tracking-[0.2em] text-ivory disabled:opacity-60">{busy ? "Thinking" : "Ask"}</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((s) => <button key={s} onClick={() => ask(s)} className="border border-line px-3 py-1.5 text-xs hover:border-crimson hover:text-crimson">{s}</button>)}
      </div>
      <div className="mt-8 space-y-6">
        <AnimatePresence initial={false}>
          {items.map((it, i) => (
            <motion.div key={items.length - i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="border-l-2 border-crimson pl-5">
              <p className="serif text-lg font-semibold">{it.q}</p>
              {it.err ? <p className="mt-2 text-sm text-red">{it.err}</p> : it.v ? <div className="mt-2"><MemoBody v={it.v} /><p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-ink-muted">{it.v.figures.filter((f) => f.verified).length}/{it.v.figures.length} figures verified · {it.v.citations.filter((c) => c.valid).length}/{it.v.citations.length} citations valid</p></div> : <motion.p className="mt-2 text-sm text-ink-muted" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2 }}>Reading the file...</motion.p>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

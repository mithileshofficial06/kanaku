"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Evidence, Report } from "@/lib/engine/analyze";
import { inr } from "@/lib/format";
import { EASE } from "../motion";

interface Ctx { report: Report; pdfUrl?: string; open: (evs: Evidence[], title: string) => void }
const EvidenceCtx = createContext<Ctx | null>(null);
export const useEvidence = () => useContext(EvidenceCtx)!;

export function tagToEvidence(tag: string): Evidence | null {
  if (/^R\d+$/.test(tag)) return { kind: "row", id: tag };
  const g = /^GST (\d{4}-\d{2})$/.exec(tag);
  if (g) return { kind: "gst", month: g[1] };
  if (tag === "ITR") return { kind: "itr", field: "grossTurnover" };
  if (tag === "PDF-META") return { kind: "meta", field: "producer" };
  return null;
}
export const evidenceTag = (e: Evidence) => (e.kind === "row" ? e.id : e.kind === "gst" ? `GST ${e.month}` : e.kind === "itr" ? "ITR" : "PDF file");

/** Small square citation chip. Invalid citations render struck through. */
export function Chip({ ev, title, label, invalid }: { ev?: Evidence | null; title?: string; label?: string; invalid?: boolean }) {
  const { open } = useEvidence();
  const text = label ?? (ev ? evidenceTag(ev) : "?");
  if (invalid || !ev)
    return <span title="Not found in the documents: this citation was rejected by the verifier" className="mx-0.5 inline-block border border-red/50 bg-red-soft px-1.5 py-px align-middle font-mono text-[10px] text-red line-through">{text}</span>;
  return (
    <button onClick={() => open([ev], title ?? text)} className="mx-0.5 inline-block border border-crimson/40 bg-ivory px-1.5 py-px align-middle font-mono text-[10px] text-crimson transition-colors hover:bg-crimson hover:text-ivory">
      {text}
    </button>
  );
}

export function EvidenceButton({ evs, title, children, className = "" }: { evs: Evidence[]; title: string; children: ReactNode; className?: string }) {
  const { open } = useEvidence();
  if (!evs.length) return <>{children}</>;
  return <button onClick={() => open(evs, title)} className={`text-left ${className}`}>{children}</button>;
}

// ------------------------------------------------------------ PDF page renderer
type PdfDoc = { numPages: number; getPage: (n: number) => Promise<{ getViewport: (o: { scale: number }) => { width: number; height: number }; render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown; canvas: HTMLCanvasElement }) => { promise: Promise<void> } }> };
const docs = new Map<string, Promise<PdfDoc>>();
async function loadDoc(url: string): Promise<PdfDoc> {
  if (!docs.has(url)) {
    docs.set(url, (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const [src, pw] = url.split("#pw=");
      return (await pdfjs.getDocument({ url: src, password: pw ? decodeURIComponent(pw) : undefined }).promise) as unknown as PdfDoc;
    })());
  }
  return docs.get(url)!;
}

export function PdfPage({ url, page, marks }: { url: string; page: number; marks: { y: number; id: string }[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<{ s: number; h: number } | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const doc = await loadDoc(url);
        const p = await doc.getPage(page);
        const width = box.current?.clientWidth ?? 600;
        const base = p.getViewport({ scale: 1 });
        const s = width / base.width, dpr = Math.min(2, window.devicePixelRatio || 1);
        const vp = p.getViewport({ scale: s * dpr });
        const c = canvas.current!;
        c.width = vp.width; c.height = vp.height;
        c.style.width = `${width}px`; c.style.height = `${base.height * s}px`;
        await p.render({ canvasContext: c.getContext("2d")!, viewport: vp, canvas: c }).promise;
        if (!dead) setGeo({ s, h: base.height });
      } catch { if (!dead) setErr(true); }
    })();
    return () => { dead = true; };
  }, [url, page]);
  return (
    <div ref={box} className="relative w-full border border-line bg-white">
      {err && <p className="p-6 text-sm text-ink-muted">The original page could not be rendered. The extracted rows are shown below.</p>}
      <canvas ref={canvas} className="block" />
      {geo && marks.map((m) => (
        <motion.div key={m.id} initial={{ opacity: 0, scaleX: 0.6 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: 0.5, ease: EASE }}
          className="pointer-events-none absolute left-[4%] right-[3%] border-2 border-crimson bg-[var(--hl)]"
          style={{ top: (geo.h - m.y - 10) * geo.s, height: 15 * geo.s }}>
          <span className="absolute -left-1 top-1/2 -translate-x-full -translate-y-1/2 bg-crimson px-1 font-mono text-[9px] text-ivory">{m.id}</span>
        </motion.div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ drawer
function Drawer({ evs, title, onClose, report, pdfUrl }: { evs: Evidence[]; title: string; onClose: () => void; report: Report; pdfUrl?: string }) {
  const rowIds = evs.filter((e) => e.kind === "row").map((e) => (e as { id: string }).id);
  const rows = useMemo(() => report.txns.filter((t) => rowIds.includes(t.id)), [report, rowIds]);
  const pages = [...new Set(rows.map((r) => r.page))].sort((a, b) => a - b);
  const [page, setPage] = useState(pages[0]);
  const gstMonths = evs.filter((e) => e.kind === "gst").map((e) => (e as { month: string }).month);
  const showItr = evs.some((e) => e.kind === "itr");
  const showMeta = evs.some((e) => e.kind === "meta");
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <>
      <motion.div className="fixed inset-0 z-50 bg-crimson-night/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside role="dialog" aria-label={title} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.5, ease: EASE }}
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[760px] flex-col bg-ivory text-ink shadow-2xl">
        <div className="flex items-start justify-between gap-6 bg-crimson px-6 py-5 text-ivory">
          <div>
            <p className="label text-ivory/70">Evidence</p>
            <h3 className="serif mt-1 text-2xl font-semibold leading-tight">{title}</h3>
          </div>
          <button onClick={onClose} className="label border border-ivory/50 px-3 py-2 hover:bg-ivory hover:text-crimson">Close</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {rows.length > 0 && (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-muted">Original statement, page {page}. Highlighted rows are the source of this finding.</p>
                {pages.length > 1 && (
                  <div className="flex flex-wrap gap-1">
                    {pages.map((p) => <button key={p} onClick={() => setPage(p)} className={`border px-2 py-1 font-mono text-xs ${p === page ? "border-crimson bg-crimson text-ivory" : "border-line"}`}>p{p}</button>)}
                  </div>
                )}
              </div>
              {pdfUrl && rows.some((r) => r.y) ? (
                <PdfPage key={`${pdfUrl}-${page}`} url={pdfUrl} page={page} marks={rows.filter((r) => r.page === page && r.y).map((r) => ({ y: r.y!, id: r.id }))} />
              ) : null}
              <table className="mt-6 w-full text-left text-[12px]">
                <thead><tr className="border-b border-ink/20 text-[10px] uppercase tracking-[0.14em] text-ink-muted"><th className="py-2">Row</th><th>Date</th><th>Narration</th><th className="text-right">Withdrawal</th><th className="text-right">Deposit</th><th className="text-right">Balance</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-line align-top">
                      <td className="py-2 font-mono text-crimson">{r.id}</td><td className="whitespace-nowrap pr-2 num">{r.date}</td><td className="pr-2">{r.narration}<span className="ml-2 text-[10px] uppercase tracking-wider text-ink-muted">{r.cat.replace("_", " ")}</span></td>
                      <td className="text-right num">{r.debit ? inr(r.debit) : ""}</td><td className="text-right num">{r.credit ? inr(r.credit) : ""}</td><td className="text-right num">{inr(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {gstMonths.length > 0 && report.gst && (
            <div className="mt-2">
              <p className="mb-3 text-sm text-ink-muted">GST returns (GSTR-3B) against genuine sales that reached the bank in the same months.</p>
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-ink/20 text-[10px] uppercase tracking-[0.14em] text-ink-muted"><th className="py-2">Month</th><th className="text-right">GST turnover</th><th className="text-right">Bank sales</th><th className="text-right">Gap</th></tr></thead>
                <tbody>
                  {report.gst.filter((g) => gstMonths.includes(g.month)).map((g) => {
                    const m = report.monthly.find((x) => x.month === g.month);
                    const bank = m ? m.digital + m.cash : 0;
                    return <tr key={g.month} className="border-b border-line"><td className="py-2 font-mono">{g.month}</td><td className="text-right num">{inr(g.taxableTurnover, 0)}</td><td className="text-right num">{inr(bank, 0)}</td><td className="text-right num text-red">{inr(g.taxableTurnover - bank, 0)}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>
          )}
          {showItr && report.itr && (
            <div className="mt-6 border border-line p-5">
              <p className="label text-crimson">Income tax return · FY {report.itr.financialYear}</p>
              <p className="mt-3 flex justify-between border-b border-line py-2"><span>Gross turnover</span><span className="num font-semibold">₹{inr(report.itr.grossTurnover, 0)}</span></p>
              <p className="flex justify-between py-2"><span>Net profit</span><span className="num">₹{inr(report.itr.netProfit, 0)}</span></p>
              {report.metrics.gstAnnualised && <p className="mt-3 text-sm text-ink-muted">GST returns imply ₹{inr(report.metrics.gstAnnualised, 0)} a year.</p>}
            </div>
          )}
          {showMeta && (
            <div className="mt-6 border border-line p-5 font-mono text-sm">
              <p className="label font-sans text-crimson">PDF file properties</p>
              {Object.entries(report.statement.pdfMeta ?? {}).map(([k, v]) => <p key={k} className="mt-2 flex justify-between gap-6 border-b border-line pb-2"><span className="text-ink-muted">{k}</span><span className={k === "producer" ? "text-red" : ""}>{String(v ?? "-")}</span></p>)}
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
}

export function EvidenceProvider({ report, pdfUrl, children }: { report: Report; pdfUrl?: string; children: ReactNode }) {
  const [state, setState] = useState<{ evs: Evidence[]; title: string } | null>(null);
  const value = useMemo<Ctx>(() => ({ report, pdfUrl, open: (evs, title) => setState({ evs, title }) }), [report, pdfUrl]);
  return (
    <EvidenceCtx.Provider value={value}>
      {children}
      <AnimatePresence>{state && <Drawer key="d" {...state} report={report} pdfUrl={pdfUrl} onClose={() => setState(null)} />}</AnimatePresence>
    </EvidenceCtx.Provider>
  );
}

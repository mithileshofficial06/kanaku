"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { Report } from "@/lib/engine/analyze";
import { Arrow, Btn, EASE, SplitChars } from "./motion";
import { Footer, Nav } from "./Nav";
import { ReportView } from "./report/ReportView";

const SAMPLES = [
  { id: "meenakshi-textiles", name: "Meenakshi Textiles", city: "Madurai", tag: "Healthy business", line: "Steady digital sales, one small loan" },
  { id: "arun-auto-spares", name: "Arun Auto Spares", city: "Coimbatore", tag: "Under stress", line: "Cash-heavy, two loans, recent bounces" },
  { id: "sri-lakshmi-traders", name: "Sri Lakshmi Traders", city: "Salem", tag: "Suspicious file", line: "Big turnover on paper, money keeps coming back" },
];
const STAGES = ["Reading the PDF row by row", "Labelling every transaction", "Re-adding every balance", "Hunting round trips and month-end cash", "Lining up bank, GST and ITR", "Sizing the loan", "Building the Path to Yes"];

function Loading() {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI((x) => Math.min(x + 1, STAGES.length - 1)), 420); return () => clearInterval(t); }, []);
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center bg-crimson px-5 text-ivory grain">
      <p className="label text-ivory/70">Analysing</p>
      <div className="mt-6 h-[70px] overflow-hidden text-center">
        <AnimatePresence mode="wait">
          <motion.p key={i} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="display text-4xl md:text-6xl">{STAGES[i]}</motion.p>
        </AnimatePresence>
      </div>
      <div className="mt-8 h-1 w-72 bg-ivory/20"><motion.div className="h-full bg-ivory" animate={{ width: `${((i + 1) / STAGES.length) * 100}%` }} transition={{ duration: 0.4 }} /></div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="block"><span className="label text-[10px] text-ink-muted">{label}</span><div className="mt-2">{children}</div>{hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}</label>;
}
const inputCls = "w-full border border-line bg-ivory px-3 py-3 text-[15px] focus:border-crimson";

function FileBox({ name, label, required, file, onFile }: { name: string; label: string; required?: boolean; file?: File; onFile: (f?: File) => void }) {
  return (
    <label className={`group flex cursor-pointer flex-col justify-between border border-dashed p-5 transition-colors ${file ? "border-crimson bg-crimson text-ivory" : "border-crimson/50 hover:bg-ivory-2"}`}>
      <span className="label text-[10px] opacity-80">{label}{required ? " · required" : " · optional"}</span>
      <span className="serif mt-6 truncate text-lg">{file ? file.name : "Choose a PDF"}</span>
      <input type="file" name={name} accept="application/pdf,.pdf" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
    </label>
  );
}

export default function AnalyzeApp() {
  const params = useSearchParams();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<{ statement?: File; gst?: File; itr?: File }>({});
  const started = useRef<string | null>(null);

  const finish = useCallback(async (p: Promise<Response>, url?: string) => {
    setLoading(true); setError("");
    const t0 = Date.now();
    try {
      const res = await p;
      const d = await res.json();
      await new Promise((r) => setTimeout(r, Math.max(0, 2600 - (Date.now() - t0)))); // let the stages play once
      if (!res.ok) throw new Error(d.error || "Analysis failed");
      setReport(d); setPdfUrl(url);
      window.scrollTo({ top: 0 });
    } catch (e) { setError(e instanceof Error ? e.message : "Analysis failed"); }
    setLoading(false);
  }, []);

  const runSample = useCallback((id: string) => {
    finish(fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sampleId: id }) }), `/samples/${id}/statement.pdf`);
  }, [finish]);

  useEffect(() => {
    const s = params.get("sample");
    if (s && started.current !== s && SAMPLES.some((x) => x.id === s)) { started.current = s; runSample(s); }
  }, [params, runSample]);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!files.statement) { setError("Add a bank statement PDF."); return; }
    const fd = new FormData(e.currentTarget);
    fd.set("statement", files.statement);
    if (files.gst) fd.set("gst", files.gst); else fd.delete("gst");
    if (files.itr) fd.set("itr", files.itr); else fd.delete("itr");
    const pw = String(fd.get("password") || "");
    finish(fetch("/api/analyze", { method: "POST", body: fd }), URL.createObjectURL(files.statement) + (pw ? `#pw=${encodeURIComponent(pw)}` : ""));
  };

  if (loading) return <><div className="bg-crimson"><Nav /></div><Loading /></>;
  if (report) return (
    <>
      <div className="bg-crimson"><Nav /></div>
      <ReportView r={report} pdfUrl={pdfUrl} onBack={() => { setReport(null); router.replace("/analyze"); started.current = null; }} />
      <Footer />
    </>
  );

  return (
    <main>
      <section className="bg-crimson text-ivory grain">
        <Nav />
        <div className="mx-auto max-w-[1400px] px-5 pb-20 pt-10 md:px-10">
          <p className="label text-ivory/70">Step 1 of 1</p>
          <SplitChars as="h1" text="Open a file." className="display mt-4 block text-7xl md:text-9xl" />
          <p className="serif mt-6 max-w-2xl text-xl italic text-ivory/85">Pick a sample business to see Kanaku work instantly, or upload your own statement. Only text-based PDF statements are supported.</p>
        </div>
      </section>
      <section className="bg-ivory">
        <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-10">
          <p className="label text-crimson">Sample businesses · synthetic data</p>
          <div className="mt-6 grid gap-px bg-line md:grid-cols-3">
            {SAMPLES.map((s, i) => (
              <motion.button key={s.id} onClick={() => runSample(s.id)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1, ease: EASE, duration: 0.7 }} className="group relative overflow-hidden bg-ivory p-8 text-left">
                <span className="absolute inset-0 translate-y-full bg-crimson transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:translate-y-0" />
                <span className="relative block transition-colors duration-300 group-hover:text-ivory">
                  <span className="label text-[10px] opacity-70">{s.tag}</span>
                  <span className="serif mt-4 block text-3xl font-semibold">{s.name}</span>
                  <span className="mt-1 block text-sm opacity-75">{s.city}</span>
                  <span className="serif mt-6 block text-lg italic">{s.line}</span>
                  <span className="mt-8 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em]">Analyse <Arrow className="transition-transform group-hover:translate-x-1" /></span>
                </span>
              </motion.button>
            ))}
          </div>

          <div className="mt-20 grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <p className="label text-crimson">Or upload your own</p>
              <h2 className="display mt-3 text-5xl text-crimson">Your documents</h2>
              <p className="mt-4 max-w-md text-ink-muted">Files are processed for this analysis only and are not stored. Never upload real customer data to a public demo: use synthetic or your own test files.</p>
              {error && <p role="alert" className="mt-6 border-l-4 border-red bg-red-soft p-4 text-sm text-red">{error}</p>}
            </div>
            <form onSubmit={submit} className="space-y-6">
              <div className="grid gap-px bg-line sm:grid-cols-3">
                <FileBox name="statement" label="Bank statement" required file={files.statement} onFile={(f) => setFiles((x) => ({ ...x, statement: f }))} />
                <FileBox name="gst" label="GST summary" file={files.gst} onFile={(f) => setFiles((x) => ({ ...x, gst: f }))} />
                <FileBox name="itr" label="ITR summary" file={files.itr} onFile={(f) => setFiles((x) => ({ ...x, itr: f }))} />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Business name"><input name="businessName" className={inputCls} placeholder="e.g. Kaveri Stores" /></Field>
                <Field label="City"><input name="city" className={inputCls} placeholder="e.g. Trichy" /></Field>
                <Field label="Loan requested (₹)"><input name="loanRequested" type="number" min={10000} step={5000} defaultValue={500000} className={inputCls} /></Field>
                <Field label="Tenure (months)"><input name="tenureMonths" type="number" min={6} max={84} defaultValue={36} className={inputCls} /></Field>
                <Field label="Years in business"><input name="vintageYears" type="number" min={0} max={80} defaultValue={3} className={inputCls} /></Field>
                <Field label="Purpose"><input name="purpose" className={inputCls} placeholder="e.g. Working capital" /></Field>
                <Field label="PDF password (if the statement has one)"><input name="password" type="password" autoComplete="off" className={inputCls} placeholder="Used only to open the file, never stored" /></Field>
              </div>
              <Btn type="submit" variant="crimson">Analyse documents <Arrow /></Btn>
            </form>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

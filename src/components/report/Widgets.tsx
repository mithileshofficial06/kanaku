"use client";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { Flag, Report } from "@/lib/engine/analyze";
import { POLICY } from "@/lib/engine/policy";
import { inr, lakh, r2 } from "@/lib/format";
import { EASE } from "../motion";
import { Chip, EvidenceButton, useEvidence } from "./Evidence";

const MON = (m: string) => new Date(m + "-01T00:00:00Z").toLocaleString("en", { month: "short", timeZone: "UTC" });
const SEV: Record<Flag["severity"], string> = { critical: "bg-red text-ivory", high: "bg-crimson text-ivory", medium: "bg-amber text-ivory", low: "bg-ink-muted text-ivory" };

// ------------------------------------------------------------ monthly chart
export function MonthlyChart({ r }: { r: Report }) {
  const W = 880, H = 300, P = { l: 56, r: 16, t: 20, b: 36 };
  const data = r.monthly;
  const max = Math.max(...data.map((m) => Math.max(m.digital + m.cash, m.opex + m.emi, m.abb))) * 1.1;
  const bw = (W - P.l - P.r) / data.length;
  const y = (v: number) => P.t + (H - P.t - P.b) * (1 - v / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const line = data.map((m, i) => `${i ? "L" : "M"}${P.l + bw * i + bw / 2},${y(m.abb)}`).join(" ");
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-6 text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        <span className="flex items-center gap-2"><i className="block h-3 w-3 bg-crimson" />Digital sales</span>
        <span className="flex items-center gap-2"><i className="block h-3 w-3 bg-crimson/45" />Cash sales</span>
        <span className="flex items-center gap-2"><i className="block h-3 w-3 bg-ink/25" />Costs + EMIs</span>
        <span className="flex items-center gap-2"><i className="block h-[2px] w-5 bg-amber" />Average balance</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Monthly sales, costs and average balance">
        {ticks.map((t) => (
          <g key={t}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--line)" /><text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ink-muted)">{lakh(t).replace("₹", "")}</text></g>
        ))}
        {data.map((m, i) => {
          const x = P.l + bw * i, w = bw * 0.34;
          return (
            <g key={m.month}>
              <motion.rect x={x + bw * 0.12} width={w} fill="var(--crimson)" initial={{ y: y(0), height: 0 }} whileInView={{ y: y(m.digital), height: y(0) - y(m.digital) }} viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.04, ease: EASE }} />
              <motion.rect x={x + bw * 0.12} width={w} fill="var(--crimson)" fillOpacity={0.45} initial={{ y: y(0), height: 0 }} whileInView={{ y: y(m.digital + m.cash), height: y(m.digital) - y(m.digital + m.cash) }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 + i * 0.04, ease: EASE }} />
              <motion.rect x={x + bw * 0.12 + w + 3} width={w} fill="var(--ink)" fillOpacity={0.22} initial={{ y: y(0), height: 0 }} whileInView={{ y: y(m.opex + m.emi), height: y(0) - y(m.opex + m.emi) }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.1 + i * 0.04, ease: EASE }} />
              <text x={x + bw / 2} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--ink-muted)">{MON(m.month)}</text>
            </g>
          );
        })}
        <motion.path d={line} fill="none" stroke="var(--amber)" strokeWidth={2.5} initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.6, delay: 0.6, ease: EASE }} />
      </svg>
    </div>
  );
}

// ------------------------------------------------------------ capacity waterfall
export function Waterfall({ r }: { r: Report }) {
  const e = r.eligibility, m = r.metrics;
  const rows: { label: string; value: number; note: string; tone: string; evs?: Flag["evidence"] }[] = [
    { label: "Monthly sales into the bank", value: e.monthlyInflow, note: m.avgCash ? `digital ${lakh(m.avgDigital)} + cash ${lakh(m.avgCash)}` : "all digital", tone: "bg-crimson" },
    { label: "Operating costs", value: -m.avgOpex, note: "suppliers, rent, wages, utilities, tax, half of owner drawings", tone: "bg-ink/30" },
    { label: "Surplus before EMIs", value: e.surplus, note: "what is left each month", tone: "bg-crimson-deep" },
    { label: `Safe EMI limit (surplus ÷ ${POLICY.minDscr})`, value: e.maxTotalEmi, note: `keeps a ${Math.round((POLICY.minDscr - 1) * 100)}% safety margin`, tone: "bg-crimson/70" },
    { label: "Existing EMIs", value: -e.existingEmi, note: m.loans.map((l) => l.lender).join(", ") || "none", tone: "bg-ink/30", evs: m.loans.flatMap((l) => l.rowIds.map((id) => ({ kind: "row" as const, id }))) },
    { label: "Room for a new EMI", value: e.emiRoom, note: `at ${POLICY.annualRate * 100}% for ${e.tenureMonths} months`, tone: "bg-forest" },
  ];
  const max = Math.max(...rows.map((x) => Math.abs(x.value)));
  return (
    <div className="space-y-2">
      {rows.map((x, i) => (
        <div key={x.label} className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 md:grid-cols-[260px_1fr_120px]">
          <div>
            <p className="text-sm font-semibold">{x.label}</p>
            <p className="text-xs text-ink-muted">{x.note}</p>
          </div>
          <div className="order-3 col-span-2 h-7 bg-ivory-2 md:order-none md:col-span-1">
            <motion.div className={`h-full ${x.tone}`} initial={{ width: 0 }} whileInView={{ width: `${(Math.abs(x.value) / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.9, delay: i * 0.12, ease: EASE }} />
          </div>
          <EvidenceButton evs={x.evs ?? []} title="Existing loans found in the statement">
            <p className={`num text-right font-mono text-sm ${x.value < 0 ? "text-ink-muted" : "font-semibold"} ${x.evs?.length ? "underline decoration-crimson/40 underline-offset-4" : ""}`}>{x.value < 0 ? "- " : ""}₹{inr(Math.abs(x.value), 0)}</p>
          </EvidenceButton>
        </div>
      ))}
      <div className="mt-6 grid gap-px bg-line sm:grid-cols-3">
        {[
          ["Loan from cash flow", lakh(e.cashflowAmount), `room converted to a loan${e.bounceFactor < 1 ? `, x${e.bounceFactor} for ${e.bounces} recent bounce${e.bounces > 1 ? "s" : ""}` : ""}`],
          ["Turnover cap", lakh(e.turnoverCap), `${POLICY.turnoverCapPct * 100}% of verified yearly turnover${m.avgCash ? " (cash at 50%)" : ""}`],
          ["Eligible", lakh(e.eligible), `the lower of the two: ${e.binding}`],
        ].map(([a, b, c], i) => (
          <div key={a} className={`p-5 ${i === 2 ? "bg-crimson text-ivory" : "bg-ivory"}`}>
            <p className={`label text-[10px] ${i === 2 ? "text-ivory/70" : "text-ink-muted"}`}>{a}</p>
            <p className="display mt-2 text-4xl">{b}</p>
            <p className={`mt-1 text-xs ${i === 2 ? "text-ivory/80" : "text-ink-muted"}`}>{c}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ flags
export function FlagList({ flags, limit }: { flags: Flag[]; limit?: number }) {
  const { open } = useEvidence();
  if (!flags.length) return <div className="border border-forest/40 bg-forest-soft p-6"><p className="display text-2xl text-forest">No red flags</p><p className="mt-1 text-sm">The statement passed every integrity and fraud check.</p></div>;
  return (
    <div className="divide-y divide-line border-y border-line">
      {flags.slice(0, limit).map((f, i) => (
        <motion.div key={f.code} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.06, ease: EASE }} className="grid gap-4 py-6 md:grid-cols-[120px_1fr_auto]">
          <span className={`label h-fit w-fit px-2 py-1 text-[10px] ${SEV[f.severity]}`}>{f.severity}</span>
          <div>
            <h4 className="serif text-xl font-semibold leading-snug">{f.title}</h4>
            <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-ink-muted">{f.detail}</p>
            {f.evidence.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1">
                {f.evidence.slice(0, 10).map((e, j) => <Chip key={j} ev={e} title={f.title} />)}
                {f.evidence.length > 10 && <button onClick={() => open(f.evidence, f.title)} className="ml-1 text-xs font-semibold text-crimson underline">+{f.evidence.length - 10} more</button>}
              </div>
            )}
          </div>
          {f.amount ? <p className="display text-3xl text-crimson md:text-right">₹{inr(f.amount, 0)}</p> : <span />}
        </motion.div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ money-flow map
function Edge({ d, stroke, opacity, width, linked, delay }: { d: string; stroke: string; opacity: number; width: number; linked: boolean; delay: number }) {
  if (linked)
    return <motion.path d={d} fill="none" stroke={stroke} strokeOpacity={opacity} strokeWidth={width} strokeDasharray="10 8" animate={{ strokeDashoffset: [0, -36] }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }} />;
  return <motion.path d={d} fill="none" stroke={stroke} strokeOpacity={opacity} strokeWidth={width} initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay }} />;
}

export function MoneyFlow({ r }: { r: Report }) {
  const { open } = useEvidence();
  const W = 760, H = 520, cx = W / 2, cy = H / 2;
  const nodes = r.flow;
  const max = Math.max(...nodes.map((n) => n.inflow + n.outflow));
  const color = { customer: "var(--forest)", supplier: "var(--ink-muted)", lender: "var(--amber)", cash: "var(--crimson-deep)", linked: "var(--red)" } as const;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Money-flow map">
        {nodes.map((n, i) => {
          const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(a) * 270, y = cy + Math.sin(a) * 195;
          const w = 1.5 + 12 * Math.sqrt((n.inflow + n.outflow) / max);
          const mx = (x + cx) / 2 + Math.sin(a) * 30, my = (y + cy) / 2 - Math.cos(a) * 30;
          const mx2 = (x + cx) / 2 - Math.sin(a) * 30, my2 = (y + cy) / 2 + Math.cos(a) * 30;
          const label = n.label.length > 22 ? n.label.slice(0, 21) + "." : n.label;
          return (
            <g key={n.key} className="cursor-pointer" onClick={() => open(n.rowIds.slice(-40).map((id) => ({ kind: "row", id })), `${n.label}: ${n.rowIds.length} transactions`)}>
              {n.inflow > 0 && <Edge d={`M${x},${y} Q${mx},${my} ${cx},${cy}`} stroke={color[n.kind]} opacity={0.8} width={n.kind === "linked" ? Math.max(3, w) : w * (n.inflow / (n.inflow + n.outflow) + 0.2)} linked={n.kind === "linked"} delay={i * 0.08} />}
              {n.outflow > 0 && <Edge d={`M${cx},${cy} Q${mx2},${my2} ${x},${y}`} stroke={color[n.kind]} opacity={0.45} width={n.kind === "linked" ? Math.max(3, w) : w * (n.outflow / (n.inflow + n.outflow) + 0.2)} linked={n.kind === "linked"} delay={0.2 + i * 0.08} />}
              <motion.g initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.4 + i * 0.08 }} style={{ transformOrigin: `${x}px ${y}px` }}>
                <rect x={x - 82} y={y - 26} width={164} height={52} fill="var(--ivory)" stroke={color[n.kind]} strokeWidth={n.kind === "linked" ? 2.5 : 1.2} />
                <text x={x} y={y - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink)">{label}</text>
                <text x={x} y={y + 13} textAnchor="middle" fontSize="11" fill={color[n.kind]} fontFamily="var(--nf-mono)">{n.inflow ? `in ${lakh(n.inflow)}` : ""}{n.inflow && n.outflow ? " · " : ""}{n.outflow ? `out ${lakh(n.outflow)}` : ""}</text>
              </motion.g>
            </g>
          );
        })}
        <rect x={cx - 74} y={cy - 32} width={148} height={64} fill="var(--crimson)" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="15" fill="var(--ivory)" fontFamily="var(--nf-display)" letterSpacing="1">{r.profile.businessName.toUpperCase().slice(0, 18)}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="10" fill="var(--ivory)" opacity={0.8}>12 months</text>
      </svg>
      <div className="mt-4 flex flex-wrap gap-5 text-[11px] uppercase tracking-[0.14em] text-ink-muted">
        {(["customer", "supplier", "lender", "cash", "linked"] as const).map((k) => <span key={k} className="flex items-center gap-2"><i className="block h-[3px] w-6" style={{ background: color[k] }} />{k === "linked" ? "linked party (round trips)" : k}</span>)}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ cross-check
export function CrossCheck({ r }: { r: Report }) {
  const m = r.metrics;
  const bars = [
    { label: "GST returns (annualised)", v: m.gstAnnualised ?? 0, ev: r.flags.find((f) => f.code === "gst_vs_bank")?.evidence ?? [] },
    { label: "Genuine sales into the bank (annualised)", v: m.bankAnnualised, ev: [] },
    { label: `Income tax return (FY ${r.itr?.financialYear ?? "-"})`, v: r.itr?.grossTurnover ?? 0, ev: r.itr ? [{ kind: "itr" as const, field: "grossTurnover" }] : [] },
  ];
  const max = Math.max(...bars.map((b) => b.v), 1);
  return (
    <div className="space-y-5">
      {bars.map((b, i) => (
        <EvidenceButton key={b.label} evs={b.ev} title={b.label} className="block w-full">
          <div className="flex items-baseline justify-between gap-4"><p className="text-sm font-semibold">{b.label}</p><p className="display text-2xl text-crimson">{b.v ? lakh(b.v) : "not provided"}</p></div>
          <div className="mt-2 h-8 bg-ivory-2"><motion.div className={i === 1 ? "h-full bg-forest" : "h-full bg-crimson"} initial={{ width: 0 }} whileInView={{ width: `${(b.v / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.15, ease: EASE }} /></div>
        </EvidenceButton>
      ))}
    </div>
  );
}

// ------------------------------------------------------------ tamper chain
export function TamperChain({ r }: { r: Report }) {
  const flag = r.flags.find((f) => f.code === "tamper_chain");
  const bad = flag?.evidence[0]?.kind === "row" ? flag.evidence[0].id : null;
  const idx = bad ? r.txns.findIndex((t) => t.id === bad) : 6;
  const rows = r.txns.slice(Math.max(1, idx - 3), idx + 3);
  return (
    <div className="divide-y divide-line border-y border-line font-mono text-[12px]">
      {rows.map((t, i) => {
        const prev = r.txns[r.txns.indexOf(t) - 1].balance;
        const exp = r2(prev + t.credit - t.debit);
        const ok = Math.abs(exp - t.balance) <= 0.5;
        return (
          <motion.div key={t.id} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.25, duration: 0.5 }} className={`grid grid-cols-[56px_1fr_auto] items-center gap-3 px-3 py-3 ${ok ? "" : "bg-red-soft text-red"}`}>
            <Chip ev={{ kind: "row", id: t.id }} title={`Row ${t.id}`} />
            <span className="num">{inr(prev)} {t.credit ? `+ ${inr(t.credit)}` : `- ${inr(t.debit)}`} = {inr(exp)}{!ok && <span className="font-sans font-semibold"> but printed {inr(t.balance)}</span>}</span>
            <span className={`label px-2 py-1 font-sans text-[10px] ${ok ? "bg-forest-soft text-forest" : "bg-red text-ivory"}`}>{ok ? "Adds up" : "Edited"}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------ round trips
export function RoundTrips({ r, limit = 6 }: { r: Report; limit?: number }) {
  const f = r.flags.find((x) => x.code === "round_trip");
  if (!f) return <p className="text-sm text-ink-muted">No round trips found in this statement.</p>;
  const ids = f.evidence.map((e) => (e as { id: string }).id);
  const pairs: [string, string][] = [];
  for (let i = 0; i < ids.length; i += 2) pairs.push([ids[i], ids[i + 1]]);
  const by = (id: string) => r.txns.find((t) => t.id === id)!;
  return (
    <div className="space-y-3">
      {pairs.slice(0, limit).map(([a, b], i) => {
        const o = by(a), c = by(b);
        const d = (Date.parse(c.date) - Date.parse(o.date)) / 86400000;
        return (
          <motion.div key={a} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border border-line bg-ivory p-3 text-sm">
            <div><Chip ev={{ kind: "row", id: a }} title="Money out" /> <span className="num font-semibold">- ₹{inr(o.debit, 0)}</span><p className="mt-1 truncate text-xs text-ink-muted">{o.date} · {o.cp}</p></div>
            <div className="flex flex-col items-center text-[10px] uppercase tracking-[0.14em] text-red">
              <motion.svg width="80" height="16" viewBox="0 0 80 16"><motion.path d="M2 8h70M66 3l6 5-6 5" stroke="currentColor" strokeWidth="1.5" fill="none" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }} /></motion.svg>
              back in {d} day{d > 1 ? "s" : ""}
            </div>
            <div className="text-right"><span className="num font-semibold text-red">+ ₹{inr(c.credit, 0)}</span> <Chip ev={{ kind: "row", id: b }} title="Money back" /><p className="mt-1 truncate text-xs text-ink-muted">{c.date} · {c.cp}</p></div>
          </motion.div>
        );
      })}
      {pairs.length > limit && <p className="text-xs text-ink-muted">and {pairs.length - limit} more pairs</p>}
    </div>
  );
}

// ------------------------------------------------------------ transactions
export function TxnTable({ r }: { r: Report }) {
  const { open } = useEvidence();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [n, setN] = useState(40);
  const flagged = useMemo(() => new Set(r.flags.flatMap((f) => f.evidence.filter((e) => e.kind === "row").map((e) => (e as { id: string }).id))), [r]);
  const cats = useMemo(() => [...new Set(r.txns.map((t) => t.cat))].sort(), [r]);
  const rows = r.txns.filter((t) => (cat === "all" || t.cat === cat) && (!q || `${t.id} ${t.narration} ${t.date}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search narration, row or date" className="w-72 border border-line bg-ivory px-3 py-2 text-sm focus:border-crimson" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="border border-line bg-ivory px-3 py-2 text-sm"><option value="all">All categories</option>{cats.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}</select>
        <span className="self-center text-xs text-ink-muted">{rows.length} rows · flagged rows marked in red</span>
      </div>
      <div className="overflow-x-auto border-y border-line">
        <table className="w-full min-w-[760px] text-left text-[12.5px]">
          <thead><tr className="border-b border-ink/20 text-[10px] uppercase tracking-[0.14em] text-ink-muted"><th className="py-2 pl-3">Row</th><th>Date</th><th>Narration</th><th>Category</th><th className="text-right">Withdrawal</th><th className="text-right">Deposit</th><th className="pr-3 text-right">Balance</th></tr></thead>
          <tbody>
            {rows.slice(0, n).map((t) => (
              <tr key={t.id} onClick={() => open([{ kind: "row", id: t.id }], `Row ${t.id}`)} className={`cursor-pointer border-b border-line hover:bg-ivory-2 ${flagged.has(t.id) ? "border-l-4 border-l-red bg-red-soft/60" : ""}`}>
                <td className="py-2 pl-3 font-mono text-crimson">{t.id}</td><td className="num whitespace-nowrap pr-3">{t.date}</td><td className="max-w-[320px] truncate pr-3">{t.narration}</td>
                <td className="pr-3 text-[11px] uppercase tracking-wider text-ink-muted">{t.cat.replace("_", " ")}</td>
                <td className="num text-right">{t.debit ? inr(t.debit) : ""}</td><td className="num text-right">{t.credit ? inr(t.credit) : ""}</td><td className="num pr-3 text-right">{inr(t.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > n && <button onClick={() => setN(n + 80)} className="label mt-4 border border-crimson px-4 py-2 text-crimson hover:bg-crimson hover:text-ivory">Show more rows</button>}
    </div>
  );
}

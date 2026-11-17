# Kanaku: AI Credit Underwriter for Indian MSMEs (Arthaton 2026)

Repo: https://github.com/mithileshofficial06/kanaku (public). Solo build.
**Commit and push very frequently**: after every working unit (each module, test, UI piece). The user wants a dense commit history.
**Save tokens**: keep reads targeted and avoid re-exploring; this file and PROGRESS.md are the source of truth.

## What it is
Hackathon entry for Arthaton 2026 (arthaton.com, AI-for-finance, Indian college students).
**Deadline: 22 Nov 2026, 11:59 PM IST. Target: submit by 22 Nov evening.**
Submission = public GitHub repo + README (what it does, how to run, AI tools credited) + demo video under 5 min.
A missing repo or video means the entry is not judged.

A loan officer (or small-business owner) uploads a bank statement PDF, GST returns and an ITR. The app returns an underwriting memo:
eligible loan amount and terms, cash-flow metrics, red flags, every number clickable back to its source row or page.

### The three unique features (locked)
1. **Path to Yes**: when the amount is reduced or rejected, show the borrower exactly what to change (move cash sales to UPI, close a small loan, 3 months with no bounces), with live what-if sliders. All of it is deterministic maths.
2. **Tamper detection**: check the running-balance chain (prev + credit - debit = balance) on every row and flag edited rows. Also check PDF metadata and fonts.
3. **Money-flow map** (stretch goal): a graph of counterparties. Round-tripping shows up as a loop.

## Key decisions
- **The LLM never does maths.** The LLM extracts, categorises and explains. TypeScript computes every number (average bank balance, DSCR, FOIR, bounces, EMIs found in the statement, GST vs bank mismatch).
- **Every claim cites its source** (row id or PDF page).
- **Synthetic data only.** We generate 3 businesses: healthy (approve), stressed (reduced amount + Path to Yes), fraud (round-tripping + tampered row).
- **Judge mode**: one-click "Load sample business" button on the landing page.
- **Demo includes a 30-second side-by-side** with plain chat: it misses the fraud and gives different numbers on a second run.
- **Output is decision support**, not a lending decision. Say so in the UI and README.

## Judges (verified)
Manoj Sarda (co-founder, Elimentary: YC AI agents for private-credit ops), Google Search AI, Perplexity, Mistral, Bernstein, Cadence.
Criteria: real-world impact, relevance, works end to end, use of AI, creativity, originality, demo quality.
Partners: Elimentary, Bondio (Bondio is an eSIM company and not relevant to the build).

## Stack (decided 17 Nov: a single Next.js app, no separate backend)
- Next.js (App Router, TypeScript) + Tailwind; server-side work runs in route handlers / server actions
- PDF parsing: pdfjs-dist (text with x/y positions, so we can parse rows deterministically and highlight the source row)
- Metrics, rules, tamper check, Path to Yes: plain TypeScript modules in `src/lib/engine/`, unit-tested with Vitest
- LLM: NVIDIA NIM (open models) through the `openai` npm SDK with base URL integrate.api.nvidia.com/v1, server only, key in .env.local (user adds it later). The provider sits behind one file (`src/lib/llm.ts`) so it can be swapped. Citations are done by hand: the model cites row IDs and code validates them. Cache the LLM outputs for the sample businesses so the demo never depends on NIM latency.
- Money-flow map: React Flow (or Cytoscape); cycle detection written by hand
- Synthetic data: Node script using pdf-lib that generates realistic statement PDFs into /public/samples
- Deploy: Vercel (live link for judges; keep uploads under the 4.5 MB request limit)

## Run / test
- `npm run dev`: app on :3000
- `npm test`: Vitest (engine unit tests)
- `npm run gen:samples`: regenerate the synthetic PDFs into public/samples
- Next 15.5.4, React 19.1, Node 24, @types/node 24 (vitest 5 needs it)

# Kanaku

**Kanaku** (Tamil: *kanakku*, "accounts / calculation") is an AI credit underwriter for Indian small businesses.

Upload a bank statement, GST returns and an ITR. Kanaku produces an underwriting memo: an eligible loan amount, cash-flow health, fraud red flags, and a **Path to Yes** that tells the business owner exactly what to change to qualify for more. Every number links back to the row or page it came from.

> Built for Arthaton 2026 (AI for Finance). All data in this repository is synthetic. Kanaku is decision support, not a lending decision.

## Status
Work in progress. The full README (architecture, setup, demo video) will be completed before submission.

## Core ideas
- **The AI reads and explains; code does the maths.** Every figure is computed deterministically in TypeScript and is reproducible.
- **Proof for every claim.** Each transaction gets an ID, the AI must cite IDs, and the app checks every citation.
- **Tamper detection.** A running-balance chain check flags edited statement rows.
- **Path to Yes.** What-if levers show how a borrower can reach the amount they asked for.

## Quick start
```bash
npm install
cp .env.example .env.local   # add your NVIDIA NIM API key
npm run gen:samples          # generate the synthetic sample businesses
npm run dev
```

## Tech
Next.js, TypeScript, Tailwind, pdfjs-dist, pdf-lib, Vitest. LLM: NVIDIA NIM (open models, via an OpenAI-compatible API).

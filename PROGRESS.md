# Progress

## Current state (17 Nov 2026, end of Day 1)
- Repo live: github.com/mithileshofficial06/kanaku (main, pushed)
- Next.js 15 scaffold, deps installed (openai, pdfjs-dist, pdf-lib, zod, vitest, tsx)
- `src/lib/samples/build.ts`: deterministic synthetic data for 3 businesses (seeded RNG)
  - meenakshi-textiles (healthy, asks ₹5L), arun-auto-spares (stressed: cash-heavy, gold loan + term loan, bounces in months 6/8/10, asks ₹5L), sri-lakshmi-traders (fraud: monthly RTGS round-trip with VENKAT/SRI BALAJI, month-end cash in then out, GST ~₹9-10L/month vs ITR ₹21.5L/year, tampered row R175 credit +45,000 drawn in Times-Roman, producer "QuickPDF Editor Online", asks ₹15L)
- `scripts/generate-samples.ts`: writes statement/gst/itr PDFs + profile.json to public/samples/<id>/, plus index.json
- `src/lib/parse/pdf.ts`: deterministic parser (pdfjs text positions); Txn has page, y, fontNames. 6/6 tests pass (exact match against ground truth)
- NIM key not added yet (user will provide; goes in .env.local)

## Plan
- [x] **Day 1 (17 Nov)**: scaffold, synthetic data generator, PDF parsing
- [ ] **Day 2 (18-19 Nov)**: `src/lib/engine/`: categorise (rule-based first, LLM for unknowns), metrics (ABB, monthly in/out, bounces, EMIs, DSCR/FOIR, eligibility), red flags (round-trip, window dressing, concentration), tamper (balance chain + font + metadata), cross-doc (GST vs bank vs ITR); tests
- [ ] **Day 3 (20 Nov)**: Path to Yes what-if engine; `src/lib/llm.ts` (NIM) memo + Q&A citing row IDs, citation validator; cache LLM output for the samples
- [ ] **Day 4 (21 Nov)**: UI: landing + judge-mode sample buttons, upload, memo view, evidence viewer (PDF page + row highlight), what-if sliders; money-flow map if time allows
- [ ] **Day 5 (22 Nov)**: polish, README + architecture diagram, Vercel deploy, demo video, submit by evening

## Next step
Day 2: build the engine modules with tests, committing after each module.

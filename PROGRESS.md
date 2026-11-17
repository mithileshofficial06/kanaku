# Progress

## Update (17 Nov 2026, later): backend complete, UI on hold
- The user asked to finish the whole project rather than go day by day, then paused the UI: **do not build the UI until the user sends a reference design.**
- Done and pushed: `src/lib/engine/` (categorise, analyze, whatif/Path to Yes, policy), `src/lib/llm.ts` (NIM: extraction fallback, labelling, memo, Q&A, citation + figure verifier, template memo when no key), `src/lib/pipeline.ts`, API routes `/api/analyze` (sampleId JSON or multipart upload), `/api/memo` (cached for samples), `/api/ask`, `/api/status`. 16/16 tests pass.
- Policy change: the DSCR surplus counts all genuine inflow; the 50% cash discount applies only to verified turnover (turnover cap). The stressed sample was retuned (cash stock purchases added).
- Sample outcomes: Meenakshi approves ₹5L (capacity ₹10.2L); Arun approves ₹1.25L of ₹5L, Path to Yes reaches the request (clean months, close the gold loan, longer tenure, cash to digital); Sri Lakshmi is referred (tamper chain R175 -₹45,000, font, metadata, 12 round-trips, 11 window-dressing pairs, GST 5.9x bank, GST vs ITR 5.4x).
- next.config: serverExternalPackages pdfjs-dist; the pdf worker is copied to public/ by postinstall (for the client PDF viewer).
- `src/app/page.tsx`, `layout.tsx` and `globals.css` are still the create-next-app defaults (the default SVGs were removed from public/).
- Remaining: UI (waiting on the reference), README write-up, Vercel deploy, demo video.

## Earlier state (17 Nov 2026, end of Day 1)
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

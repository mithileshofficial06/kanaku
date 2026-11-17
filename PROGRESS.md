# Progress

## Current state (17 Nov 2026, night): feature-complete, README done
- LLM: NVIDIA NIM with one key. Smart = nvidia/nemotron-3-ultra-550b-a55b (memo about 15s, Ask about 5s, thinking off). Fast = nvidia/nemotron-3.5-lightning-30b-a3b (labels, AI reader). Mistral Large 4 was too slow (>2 min) and was dropped. `reasoningOpts()` in llm.ts sets the per-model thinking controls.
- Memo prompt: only real tags (R#, GST YYYY-MM, ITR, PDF-META), tags only on claims about that source; a refer verdict means no amounts in Path to Yes. Verified 0 bad figures / 0 bad cites on all samples (`scripts/bench-memo.ts`, `scripts/bench-ask.ts`).
- Parser: layout-aware (many date styles, Dr/Cr amount column, Cr suffix, wrapped rows, value-date columns, newest first); every parse must reconcile against the balance chain (>= 90%) or the AI reader takes over. The AI copies cells; direction comes from the balance arithmetic. Password PDFs supported; scanned PDFs get a ReadError.
- `public/samples/formats/`: layouts a/b/c (parser), d (AI), scanned. One-click tests on /analyze ("Other bank layouts"). 21 tests.
- Report banner "checks" strip: reader, rows reconciling, AI labels, memo. Proof drawer render race fixed and it auto-scrolls to the highlighted row. Concurrent memo requests share one AI call.
- README (full, with screenshots in docs/screens) and docs/DEMO-SCRIPT.md written.
- Tile grids (features, how-it-works, samples, analyze samples + layouts, feature-page steps) auto-cycle their highlight every 3.5s via `useCycle()` in motion.tsx; hovering pauses and follows the cursor; leaving resumes from the hovered tile. Style tiles with `data-[on]:` / `group-data-[on]:`, not `hover:`.
- Blind test (17 Nov night): scripts/make-realistic-statement.ts makes an unseen-layout bakery statement (clean + forged, SEED/OUT_DIR env), fixtures in test-data/blind (+ overdraft/), asserted by src/lib/engine/blind.test.ts. It found and fixed: settlement/BY CASH/ACH-lender narrations, IFSC as counterparty, aggregator concentration, opening-balance row, overdraft sign, drawings policy (drawingsWeight 0.5), AI labels keyed by narration pattern, memo citing GST/ITR that were not uploaded. 25 tests.
- Gotcha: don't write files into the project while `next dev` runs (it recompiles and pages time out). Take screenshots against `next build && next start`.

## Next step
1. The user deploys to Vercel (import the repo, add the NIM_* env vars), then the live link goes into the README.
2. The user records the video following docs/DEMO-SCRIPT.md (warm the memo cache first), uploads it, and the link goes into the README.
3. Submit before 22 Nov, 11:59 PM IST.

## Update (17 Nov 2026, evening): UI built from the user's reference
- Reference: crimson #790B13 + ivory #FFF0DC editorial style. The user asked for: square corners only, motion animations, text animations, high legibility, a hero, a landing page, and one page per feature.
- Fonts: Anton (display), Fraunces (serif + italic), Inter Tight (body), Geist Mono (numbers). Tokens live in globals.css; next/font vars are --nf-*.
- `src/components/motion.tsx`: Reveal, SplitChars, SplitWords, Counter, Marquee, Btn (sweep hover), Rule
- `/`: hero with a live statement scanner (catches R175), marquee, problem counters, how-it-works + pipeline, features grid, samples, chatbot comparison, CTA
- `/features/[slug]`: 7 static pages (content in src/lib/features.ts) with live demos from `src/lib/demo.ts` (the real pipeline on the sample PDFs at build time)
- `/analyze`: sample picker (supports ?sample=id), upload form, staged loader, ReportView (banner, memo + verify badge, waterfall, chart, flags, Path to Yes sliders, money flow, cross-check, txn table, Ask). The evidence drawer renders the original PDF page with rows highlighted (pdfjs client, worker in public/).
- Verified by Playwright screenshots (desktop + mobile), with no console errors. `next build` passes; 16/16 tests.
- Remaining: README write-up (architecture, setup, credits), Vercel deploy (the user deploys or authorises the Vercel MCP), NIM key in .env.local, demo video.

## Update (17 Nov 2026, later): backend complete
- The UI was paused until the user sent a reference design (since done, see above).
- Done and pushed: `src/lib/engine/` (categorise, analyze, whatif/Path to Yes, policy), `src/lib/llm.ts` (NIM: extraction fallback, labelling, memo, Q&A, citation + figure verifier, template memo when no key), `src/lib/pipeline.ts`, API routes `/api/analyze` (sampleId JSON or multipart upload), `/api/memo` (cached for samples), `/api/ask`, `/api/status`. 16/16 tests pass.
- Policy change: the DSCR surplus counts all genuine inflow; the 50% cash discount applies only to verified turnover (turnover cap). The stressed sample was retuned (cash stock purchases added).
- Sample outcomes: Meenakshi approves ₹5L (capacity ₹10.2L); Arun approves ₹1.25L of ₹5L, Path to Yes reaches the request (clean months, close the gold loan, longer tenure, cash to digital); Sri Lakshmi is referred (tamper chain R175 -₹45,000, font, metadata, 12 round-trips, 11 window-dressing pairs, GST 5.9x bank, GST vs ITR 5.4x).
- next.config: serverExternalPackages pdfjs-dist; the pdf worker is copied to public/ by postinstall (for the client PDF viewer).

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

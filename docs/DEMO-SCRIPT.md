# Kanaku demo video script (target 3:30, hard limit 5:00)

Record at 1920x1080, browser zoom 100%, nothing else on screen. Use the production build (`npm run build && npm start`), not the dev server.

**Before you record:** open every sample once so the AI memos are cached. That way nothing makes you wait on camera, and the Next.js "N" badge isn't shown.

| Time | Screen | Say (roughly) |
|---|---|---|
| 0:00–0:15 | Landing page reload: the intro loader plays, then the hero | "Small businesses in India get loans based on their bank statements. Lenders either read them by hand or run rules that just say no. This is Kanaku." |
| 0:15–0:30 | Hover the hero cards | "Every rupee is traced. It catches edited statements and fake turnover, and when the answer is no, it shows the owner a path to yes." |
| 0:30–0:40 | Click **Watch it catch a fraud** | "Here's a trader in Salem asking for fifteen lakh." |
| 0:40–1:05 | Report banner: **Refer to fraud review**. Point at the checks strip | "One minute later: refer to fraud review. Notice the strip. Two hundred eighty-six of 287 rows add up. One doesn't." |
| 1:05–1:30 | Memo: click the **R175** chip, and the PDF page opens with the row highlighted | "Every claim has a citation. Click it and you see the original page. Row 175: someone added forty-five thousand to a credit. The balance chain breaks right there, the amount uses a different font, and the PDF was saved by an online editor." |
| 1:30–1:50 | Scroll to **Money flow** | "Twelve times, money went out to two parties and came back within a week. That's round-tripping, and it shows up as these loops." |
| 1:50–2:05 | **Three documents** | "GST says one point one five crore a year. The bank shows nineteen lakh of real sales, and the ITR says twenty-one. Three filings, three different businesses." |
| 2:05–2:20 | **Ask Kanaku**: type "Why was this file sent to fraud review?" | "You can ask questions. The answer cites rows too, and every number in it is checked against the engine." |
| 2:20–2:50 | Back, open **Arun Auto Spares**, go to **Path to Yes**, move the sliders | "Now an honest but stressed business: five lakh asked, one point two five today. Instead of just saying no, Kanaku shows the plan. Close the small gold loan, take a longer tenure, six months with no bounces, move cash sales to UPI. That gets to five point five five lakh. Every slider recomputes it with the same maths." |
| 2:50–3:05 | Analyze page: **Other bank layouts**. Run **Unknown layout**, then **Scanned image** | "It isn't tied to one bank's format. Here's a layout no rule understands: the AI reads the cells, and the balance arithmetic decides whether to trust them. Same answer. A scanned image gets refused, with the reason, instead of a guess." |
| 3:05–3:25 | Memo badge: **28/28 figures, 28/28 citations** | "The key design choice: the AI never does the maths. A deterministic engine computes every number. NVIDIA Nemotron writes the memo, and code checks every figure and citation before you see it." |
| 3:25–3:35 | Landing page footer, or the GitHub README | "Kanaku. Every rupee proven. The code and README are on GitHub." |

## If something goes wrong on camera
- If a memo is slow, it's the first AI call for that sample. Cut and re-record; the second load is instant.
- Keep each take short. It's easier to stitch three clean 1-minute takes than one 3:30 take.

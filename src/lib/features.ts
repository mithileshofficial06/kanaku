export interface Feature {
  slug: string;
  num: string;
  short: string;
  title: string;
  kicker: string;
  lede: string;
  problem: string;
  steps: { title: string; body: string }[];
  youSee: string[];
  sample: "meenakshi-textiles" | "arun-auto-spares" | "sri-lakshmi-traders";
}

export const FEATURES: Feature[] = [
  {
    slug: "repayment-capacity", num: "01", short: "Repayment capacity",
    title: "How much can they really repay?", kicker: "The underwriting engine",
    lede: "Twelve months of bank rows turned into one honest number, with every step of the maths in the open.",
    problem: "A loan officer reads hundreds of transactions by hand to estimate income, spot existing loans and decide an amount. It takes hours, two officers rarely agree, and nobody can explain the number afterwards.",
    steps: [
      { title: "Label every row", body: "Rules sort each transaction into sales, cash, EMIs, rent, wages, suppliers, tax and more. The AI only labels rows the rules cannot place." },
      { title: "Find existing loans", body: "Recurring EMI debits are grouped by lender and loan number, so hidden loans surface on their own." },
      { title: "Compute the surplus", body: "Average monthly sales minus operating costs gives the surplus that can service debt." },
      { title: "Size the loan", body: "The surplus must cover all EMIs 1.25 times. What is left, adjusted for bounces and capped at 20% of verified turnover, becomes the eligible amount." },
    ],
    youSee: ["Eligible amount next to the amount asked", "Which limit is binding: cash flow or turnover", "Every existing EMI, linked to its rows", "The policy assumptions, stated plainly"],
    sample: "arun-auto-spares",
  },
  {
    slug: "path-to-yes", num: "02", short: "Path to Yes",
    title: "Every no comes with a way to yes.", kicker: "Built for the borrower",
    lede: "Instead of a flat rejection, the owner sees exactly which changes unlock the amount they asked for.",
    problem: "Small businesses are told no, or offered less, with no explanation. They reapply blindly, get rejected again, and turn to informal lenders at far higher rates.",
    steps: [
      { title: "Find the levers", body: "Kanaku checks which realistic changes apply: taking cash sales digitally, staying bounce-free, closing the smallest loan, or a longer tenure." },
      { title: "Measure each one", body: "Each lever is run through the same eligibility maths, so its effect is exact, not a guess." },
      { title: "Build the plan", body: "Levers are applied in order of impact until the requested amount is reached." },
      { title: "Let them explore", body: "Sliders recompute the offer instantly, so the owner can test their own plan." },
    ],
    youSee: ["A ranked plan with the rupee gain of each step", "Live sliders for every lever", "Whether the full request is reachable"],
    sample: "arun-auto-spares",
  },
  {
    slug: "tamper-detection", num: "03", short: "Tamper detection",
    title: "Edited statements cannot hide.", kicker: "Document integrity",
    lede: "One changed number breaks the arithmetic of the whole statement. Kanaku checks every row.",
    problem: "Editing a PDF bank statement takes minutes. Inflating a few deposits makes a weak business look strong, and a tired reviewer will not notice.",
    steps: [
      { title: "Re-run the balance chain", body: "For every row: previous balance + deposit - withdrawal must equal the printed balance. An edited amount breaks the chain at exactly that row." },
      { title: "Compare fonts", body: "Bank systems print every amount in one font. Text typed over in an editor usually uses a different one." },
      { title: "Read the file's history", body: "PDF metadata shows which software saved the file. Online editors leave their name behind." },
    ],
    youSee: ["The exact row that was edited and by how much", "The tampered amount highlighted on the original PDF page", "An automatic referral to fraud review"],
    sample: "sri-lakshmi-traders",
  },
  {
    slug: "fraud-patterns", num: "04", short: "Fraud patterns",
    title: "Money that leaves and comes back.", kicker: "Round-tripping and window dressing",
    lede: "Fake turnover has a shape. Kanaku looks for it in every statement.",
    problem: "Borrowers inflate turnover by sending money to a friendly party that sends it straight back, or by parking cash at month-end. Both look like healthy activity row by row.",
    steps: [
      { title: "Match outflows to returns", body: "Large payments to a party are matched to credits from the same party within 7 days, within 5% of the amount." },
      { title: "Watch the month boundary", body: "Big cash deposits in the last 3 days of a month that are withdrawn in the first days of the next are flagged." },
      { title: "Remove them from income", body: "Flagged money is excluded before any eligibility maths runs." },
    ],
    youSee: ["Each round trip as a pair of linked rows", "Total fake turnover removed", "The linked parties on the money-flow map"],
    sample: "sri-lakshmi-traders",
  },
  {
    slug: "cross-check", num: "05", short: "Three-document check",
    title: "Bank, GST and ITR must agree.", kicker: "Cross-document verification",
    lede: "A business has one real turnover. Kanaku checks that all three documents tell the same story.",
    problem: "Each document is usually reviewed on its own. A GST return can claim ten times the sales that ever reach the bank, and nobody lines them up.",
    steps: [
      { title: "Read each document", body: "The GST summary, the income tax return and the bank statement are parsed into numbers." },
      { title: "Line up the months", body: "GST turnover is compared with genuine bank sales for the same months." },
      { title: "Compare the year", body: "Annualised GST turnover is compared with the ITR. More than 30% apart is flagged." },
    ],
    youSee: ["Side-by-side turnover from all three sources", "The size of every gap", "Links to the exact GST months and ITR line"],
    sample: "sri-lakshmi-traders",
  },
  {
    slug: "proof", num: "06", short: "Proof for every number",
    title: "The AI explains. Code does the maths.", kicker: "Grounded, verified AI",
    lede: "Every figure in the memo is checked against computed facts, and every claim links to its source row.",
    problem: "Ask a general chatbot to analyse a statement and it will add up rows slightly wrong, give different totals each time, and cite nothing a credit manager can check.",
    steps: [
      { title: "Numbers come from code", body: "Every total, ratio and limit is computed by deterministic TypeScript. Same input, same answer, every time." },
      { title: "The AI writes, with citations", body: "An open model on NVIDIA NIM writes the memo from the computed facts and must cite row IDs like [R175]." },
      { title: "Every citation is checked", body: "Kanaku verifies that each cited row exists and that each rupee figure matches a computed value. Anything invented is marked." },
    ],
    youSee: ["Clickable citation chips on every claim", "A verification badge: figures matched, citations checked", "Questions answered with the same rules"],
    sample: "arun-auto-spares",
  },
  {
    slug: "money-flow", num: "07", short: "Money-flow map",
    title: "See where the money goes.", kicker: "Counterparty map",
    lede: "One picture of who pays the business, who it pays, and which parties are suspiciously connected.",
    problem: "A table of 400 rows hides patterns that are obvious in a picture: one customer paying everything, or a party that money keeps cycling through.",
    steps: [
      { title: "Group by counterparty", body: "Names in UPI, NEFT, RTGS and ACH narrations are normalised so one party is one node." },
      { title: "Weigh the flows", body: "Line thickness shows how much money moved in each direction." },
      { title: "Mark linked parties", body: "Parties involved in round trips are drawn in red with money flowing both ways." },
    ],
    youSee: ["Customers, suppliers, lenders and cash in one view", "Linked parties highlighted", "Click any node to see its rows"],
    sample: "sri-lakshmi-traders",
  },
];

export const featureBySlug = (s: string) => FEATURES.find((f) => f.slug === s);

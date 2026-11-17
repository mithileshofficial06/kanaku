import { Suspense } from "react";
import AnalyzeApp from "@/components/AnalyzeApp";

export const metadata = { title: "Analyse a business | Kanaku" };

export default function AnalyzePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-crimson" />}>
      <AnalyzeApp />
    </Suspense>
  );
}

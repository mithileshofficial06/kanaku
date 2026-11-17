import { NextRequest, NextResponse } from "next/server";
import { writeMemo, type Verified } from "@/lib/llm";
import type { Report } from "@/lib/engine/analyze";

export const runtime = "nodejs";
export const maxDuration = 60;

// Sample memos are cached so the demo never waits on the LLM twice.
const cache = new Map<string, Verified>();

export async function POST(req: NextRequest) {
  const { report } = (await req.json()) as { report: Report };
  if (!report?.txns?.length) return NextResponse.json({ error: "Missing report" }, { status: 400 });
  const key = report.profile.id !== "upload" ? report.profile.id : null;
  if (key && cache.has(key)) return NextResponse.json(cache.get(key));
  const memo = await writeMemo(report);
  if (key && memo.source === "llm") cache.set(key, memo);
  return NextResponse.json(memo);
}

import { NextRequest, NextResponse } from "next/server";
import { writeMemo, type Verified } from "@/lib/llm";
import type { Report } from "@/lib/engine/analyze";

export const runtime = "nodejs";
export const maxDuration = 60;

// Sample memos are cached so the demo never waits on the LLM twice.
// Requests for the same sample while one is being written share it, so the AI is called once.
const cache = new Map<string, Verified>();
const inflight = new Map<string, Promise<Verified>>();

export async function POST(req: NextRequest) {
  const { report } = (await req.json()) as { report: Report };
  if (!report?.txns?.length) return NextResponse.json({ error: "Missing report" }, { status: 400 });
  const key = report.profile.id !== "upload" ? report.profile.id : null;
  if (key && cache.has(key)) return NextResponse.json(cache.get(key));
  if (!key) return NextResponse.json(await writeMemo(report));
  let job = inflight.get(key);
  if (!job) {
    job = writeMemo(report).finally(() => inflight.delete(key));
    inflight.set(key, job);
  }
  const memo = await job;
  if (memo.source === "llm") cache.set(key, memo);
  return NextResponse.json(memo);
}

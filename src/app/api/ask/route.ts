import { NextRequest, NextResponse } from "next/server";
import { answer } from "@/lib/llm";
import type { Report } from "@/lib/engine/analyze";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { report, question } = (await req.json()) as { report: Report; question: string };
  if (!report?.txns?.length || !question?.trim()) return NextResponse.json({ error: "Missing question" }, { status: 400 });
  try {
    return NextResponse.json(await answer(report, question.slice(0, 500)));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not answer" }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { llmEnabled, modelNames } from "@/lib/llm";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ llm: llmEnabled(), models: modelNames(), provider: "NVIDIA NIM" });
}

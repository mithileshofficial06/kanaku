import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import type { BusinessProfile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SAMPLES = ["meenakshi-textiles", "arun-auto-spares", "sri-lakshmi-traders"];
const MAX = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get("content-type")?.includes("application/json")) {
      const { sampleId } = await req.json();
      if (!SAMPLES.includes(sampleId)) return NextResponse.json({ error: "Unknown sample" }, { status: 400 });
      const get = async (f: string) => new Uint8Array(await (await fetch(`${req.nextUrl.origin}/samples/${sampleId}/${f}`)).arrayBuffer());
      const profile = (await (await fetch(`${req.nextUrl.origin}/samples/${sampleId}/profile.json`)).json()) as BusinessProfile;
      const report = await runPipeline({ statement: await get("statement.pdf"), gst: await get("gst.pdf"), itr: await get("itr.pdf"), profile });
      return NextResponse.json(report);
    }
    const form = await req.formData();
    const file = async (k: string) => {
      const f = form.get(k);
      if (!(f instanceof File) || !f.size) return undefined;
      if (f.size > MAX) throw new Error(`${k} is larger than 4 MB`);
      if (!/pdf/i.test(f.type) && !f.name.toLowerCase().endsWith(".pdf")) throw new Error(`${k} must be a PDF`);
      return new Uint8Array(await f.arrayBuffer());
    };
    const statement = await file("statement");
    if (!statement) return NextResponse.json({ error: "A bank statement PDF is required" }, { status: 400 });
    const num = (k: string, d: number) => { const v = Number(form.get(k)); return Number.isFinite(v) && v > 0 ? v : d; };
    const name = String(form.get("businessName") || "Uploaded business").slice(0, 80);
    const profile: BusinessProfile = {
      id: "upload", businessName: name, ownerName: "", city: String(form.get("city") || "").slice(0, 60) || "Not given", constitution: "Not given",
      vintageYears: num("vintageYears", 3), gstin: "", loanRequested: num("loanRequested", 500000), tenureMonths: Math.min(84, num("tenureMonths", 36)),
      purpose: String(form.get("purpose") || "Business loan").slice(0, 120), scenario: "healthy", tagline: "",
    };
    const report = await runPipeline({ statement, gst: await file("gst"), itr: await file("itr"), profile });
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Analysis failed" }, { status: 422 });
  }
}

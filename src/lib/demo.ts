// Server-side demo data for the marketing pages: the real pipeline run on the sample PDFs
// (parsed with positions, so evidence chips can highlight rows on the original page).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Report } from "./engine/analyze";
import { runPipeline } from "./pipeline";
import type { BusinessProfile } from "./types";

export const SAMPLE_IDS = ["meenakshi-textiles", "arun-auto-spares", "sri-lakshmi-traders"] as const;
let cache: Promise<Record<string, Report>> | null = null;

async function load(id: string): Promise<Report> {
  const dir = join(process.cwd(), "public", "samples", id);
  const f = async (n: string) => new Uint8Array(await readFile(join(dir, n)));
  const profile = JSON.parse(await readFile(join(dir, "profile.json"), "utf8")) as BusinessProfile;
  return runPipeline({ statement: await f("statement.pdf"), gst: await f("gst.pdf"), itr: await f("itr.pdf"), profile });
}

export function demoReports(): Promise<Record<string, Report>> {
  if (!cache) cache = Promise.all(SAMPLE_IDS.map(load)).then((rs) => Object.fromEntries(rs.map((r) => [r.profile.id, r])));
  return cache;
}

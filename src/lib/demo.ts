// Server-side demo data for the marketing pages: the real engine run on the synthetic samples.
import { analyze, type Report } from "./engine/analyze";
import { buildSamples } from "./samples/build";

let cache: Record<string, Report> | null = null;

export function demoReports(): Record<string, Report> {
  if (!cache) {
    cache = {};
    for (const s of buildSamples()) cache[s.profile.id] = analyze(s.statement, s.profile, s.gst, s.itr);
  }
  return cache;
}

export const demoReport = (id: string) => demoReports()[id];

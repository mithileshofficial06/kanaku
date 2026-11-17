import { notFound } from "next/navigation";
import FeaturePage from "@/components/FeaturePage";
import { demoReports } from "@/lib/demo";
import { FEATURES, featureBySlug } from "@/lib/features";

export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const f = featureBySlug((await params).slug);
  return { title: f ? `${f.short} | Kanaku` : "Kanaku", description: f?.lede };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = featureBySlug(slug);
  if (!f) notFound();
  const report = (await demoReports())[f.sample];
  const i = FEATURES.indexOf(f);
  return <FeaturePage feature={f} report={report} next={FEATURES[(i + 1) % FEATURES.length]} prev={FEATURES[(i + FEATURES.length - 1) % FEATURES.length]} />;
}

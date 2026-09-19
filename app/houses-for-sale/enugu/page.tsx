import type { Metadata } from "next";
import { SeoListingPage } from "@/components/seo-listing-page";
import { landingMetadata, seoLandings } from "@/lib/seo";
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> { const query = await searchParams; const page = Math.max(1, Number(query.page) || 1); return landingMetadata(seoLandings.houses, page, Object.keys(query).every((key) => key === "page")); }
export default async function Page({ searchParams }: Props) { const query = await searchParams; return <SeoListingPage landing={seoLandings.houses} page={Math.max(1, Number(query.page) || 1)} />; }

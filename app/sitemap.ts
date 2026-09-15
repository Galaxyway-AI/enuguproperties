import type { MetadataRoute } from "next";
import { getAreas, getProperties } from "@/lib/catalogue";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://enuguproperties.com";
  const [areas, result] = await Promise.all([getAreas(), getProperties()]);
  return [
    "",
    "/properties",
    "/properties/houses",
    "/properties/land",
    "/properties/commercial",
    "/areas",
    "/verification",
    "/safety",
    "/about",
    "/pricing",
    "/sell",
    "/how-it-works",
    "/buying-from-abroad",
    "/contact",
    "/legal/terms",
    "/legal/privacy",
    "/legal/seller-terms",
    ...areas.map((a) => `/areas/${a.slug}`),
    ...result.properties
      .filter((p) => !p.demo)
      .map((p) => `/property/${p.slug}`),
  ].map((path) => ({ url: base + path }));
}

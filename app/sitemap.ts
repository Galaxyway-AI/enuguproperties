import type { MetadataRoute } from "next";
import { getAreas, getProperties } from "@/lib/catalogue";
import { areaGuides, seoLandings, siteUrl } from "@/lib/seo";
import { editorialArticles } from "@/lib/editorial";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [areas, result] = await Promise.all([getAreas(), getProperties()]);
  const areaInventory = await Promise.all(
    areas.map(async (area) => ({ area, count: (await getProperties({ area: area.slug })).count })),
  );
  const staticPaths = [
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
    ...Object.values(seoLandings).map((landing) => landing.slug),
    "/market-insights",
    ...editorialArticles.map((article) => `/market-insights/${article.slug}`),
    ...areaInventory
      .filter(({ area, count }) => count > 0 || Boolean(areaGuides[area.slug]))
      .map(({ area }) => `/areas/${area.slug}`),
  ];
  return [
    ...staticPaths.map((path) => ({ url: siteUrl + path })),
    ...result.properties.filter((property) => !property.demo).map((property) => ({
      url: `${siteUrl}/property/${property.slug}`,
      lastModified: property.updated_at,
      images: property.images.map((image) => new URL(image, siteUrl).toString()),
    })),
  ];
}

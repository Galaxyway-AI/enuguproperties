import "server-only";
import { serverQuery } from "./server-db";
import { absoluteUrl, siteUrl } from "./seo";

export const indexNowKey = "f4b8c2e7630a4d5e91f7b6c8d2a0593e";

export async function notifyIndexNow(paths: string[]) {
  const urls = [...new Set(paths.map((path) => absoluteUrl(path)))].slice(0, 100);
  if (!urls.length) return;
  try {
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: "enuguproperties.com",
        key: indexNowKey,
        keyLocation: `${siteUrl}/${indexNowKey}.txt`,
        urlList: urls,
      }),
    });
    if (!response.ok && response.status !== 202) throw new Error(`IndexNow returned ${response.status}`);
  } catch (error) {
    console.error(JSON.stringify({ event: "indexnow_failed", message: error instanceof Error ? error.message : "Unknown error" }));
  }
}

export async function notifyIndexNowForProperty(propertyId: string) {
  const [property] = await serverQuery<{ slug: string }>("select slug from public.properties where id=$1", [propertyId]);
  if (property) await notifyIndexNow([`/property/${property.slug}`, "/sitemap.xml"]);
}

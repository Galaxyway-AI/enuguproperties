import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const production = new URL(request.url).hostname === "enuguproperties.com";
  const body = production
    ? [
        "User-agent: *",
        "Allow: /",
        "Disallow: /account/",
        "Disallow: /admin/",
        "Disallow: /api/",
        "Disallow: /login",
        "Disallow: /register",
        "Disallow: /reset-password",
        `Sitemap: ${siteUrl}/sitemap.xml`,
      ].join("\n")
    : "User-agent: *\nDisallow: /";
  return new Response(`${body}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}

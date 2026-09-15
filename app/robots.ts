import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://enuguproperties.com";
  const indexingAllowed =
    process.env.PREVIEW_MODE !== "true" &&
    new URL(base).hostname === "enuguproperties.com";
  if (!indexingAllowed) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account/",
        "/admin/",
        "/api/",
        "/login",
        "/register",
        "/properties?",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}

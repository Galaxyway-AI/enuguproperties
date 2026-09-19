import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { editorialArticles } from "../lib/editorial";
import {
  absoluteUrl,
  areaGuides,
  landingMetadata,
  propertySeoDescription,
  propertySeoTitle,
  seoLandings,
  siteUrl,
} from "../lib/seo";
import type { PublicProperty } from "../lib/domain";

const property: PublicProperty = {
  id: "1", reference: "EP-2026-000001", slug: "four-bedroom-duplex-ep-2026-000001",
  title: "Amazing urgent duplex", description: "A detached home.", category: "houses",
  listing_purpose: "sale", area: "Trans Ekulu", area_slug: "trans-ekulu", price_minor: 20000000000,
  bedrooms: 4, bathrooms: 5, property_type: "detached-house", land_sqm: 500, features: [], images: [],
  seller_type: "owner", status: "live", created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-19T00:00:00Z",
  featured: false, price_reduced: false, checks: [],
};

test("all curated commercial pages have unique canonical production URLs", () => {
  const landings = Object.values(seoLandings);
  assert.equal(new Set(landings.map(({ slug }) => slug)).size, landings.length);
  for (const landing of landings) {
    assert.match(absoluteUrl(landing.slug), /^https:\/\/enuguproperties\.com\//);
    const metadata = landingMetadata(landing);
    assert.equal(metadata.alternates?.canonical, landing.slug);
    assert.ok(metadata.title);
    assert.ok(metadata.description);
  }
});

test("arbitrary landing filters are noindex while pagination is self-canonical", () => {
  const filtered = landingMetadata(seoLandings.sale, 1, false);
  assert.deepEqual(filtered.robots, { index: false, follow: true });
  const pageTwo = landingMetadata(seoLandings.sale, 2, true);
  assert.equal(pageTwo.alternates?.canonical, "/property-for-sale/enugu?page=2");
  assert.equal(pageTwo.robots, undefined);
});

test("property metadata is generated from structured facts", () => {
  assert.equal(propertySeoTitle(property), "4 Bedroom Detached House for Sale in Trans Ekulu, Enugu");
  assert.match(propertySeoDescription(property), /View price, photos/);
  assert.ok(propertySeoDescription(property).length <= 160);
});

test("the initial editorial cluster and five researched area guides are present", () => {
  assert.equal(editorialArticles.length, 5);
  assert.equal(new Set(editorialArticles.map(({ slug }) => slug)).size, 5);
  assert.equal(Object.keys(areaGuides).length, 5);
  for (const article of editorialArticles) {
    assert.ok(article.sections.length >= 6);
    assert.ok(article.sources.length >= 2);
  }
});

test("production SEO files cannot fall back to the workers.dev domain", async () => {
  const [layout, sitemap, proxy] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../proxy.ts", import.meta.url), "utf8"),
  ]);
  assert.equal(siteUrl, "https://enuguproperties.com");
  assert.doesNotMatch(layout, /emailgalaxyway\.workers\.dev/);
  assert.doesNotMatch(sitemap, /NEXT_PUBLIC_APP_URL/);
  assert.match(proxy, /request\.nextUrl\.hostname !== "enuguproperties\.com"/);
});

test("robots, sitemap and redirect rules protect the production index", async () => {
  const [robots, sitemap, proxy] = await Promise.all([
    readFile(new URL("../app/robots.txt/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../proxy.ts", import.meta.url), "utf8"),
  ]);
  assert.match(robots, /Disallow: \/account\//);
  assert.match(robots, /Disallow: \/admin\//);
  assert.match(robots, /Disallow: \//);
  assert.match(robots, /Sitemap: \$\{siteUrl\}\/sitemap\.xml/);
  assert.match(sitemap, /editorialArticles/);
  assert.match(sitemap, /property\.images/);
  assert.match(proxy, /hostname === "www\.enuguproperties\.com"/);
  assert.match(proxy, /canonical\.hostname = "enuguproperties\.com"/);
});

test("public templates retain structured data, breadcrumbs and real 404 handling", async () => {
  const [layout, propertyPage, articlePage, areaPage] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/property/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/market-insights/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/areas/[[...slug]]/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /"@type": "Organization"/);
  assert.match(layout, /"@type": "WebSite"/);
  assert.match(propertyPage, /"@type": "RealEstateListing"/);
  assert.match(propertyPage, /"@type": "BreadcrumbList"/);
  assert.match(propertyPage, /notFound\(\)/);
  assert.match(articlePage, /"@type": "Article"/);
  assert.match(articlePage, /"@type": "BreadcrumbList"/);
  assert.match(areaPage, /"@type": "BreadcrumbList"/);
});

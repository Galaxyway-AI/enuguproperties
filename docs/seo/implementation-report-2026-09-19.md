# SEO implementation report — 19 September 2026

## Release outcome

The first Enugu-focused SEO release is live on `https://enuguproperties.com`. It fixes the production crawl block and staging-domain canonical error, establishes the commercial and editorial architecture, and adds safeguards so future deployments cannot quietly point search engines at the preview Worker.

Production Worker version: `e7e53b23-0875-4e80-8ae5-68dc0fe6b3cf`.

## Audit and research delivered

- [Current SEO audit](./current-seo-audit.md)
- [Competitive landscape](./competitive-landscape.md)
- [Keyword and intent map](./keyword-map.md)
- [September 2026 baseline](./baseline-2026-09.md)
- [Search Console, Bing and IndexNow runbook](./search-console-runbook.md)
- [Authority-building plan](./authority-building-plan.md)

The research found that category, location and inventory pages dominate the important Enugu commercial searches. The site therefore uses one preferred page per intent and keeps arbitrary filter combinations out of the index.

## Pages created or improved

Seven commercial landing pages now combine current inventory, search controls, useful guidance and internal links:

- Property for Sale in Enugu
- Houses for Sale in Enugu
- Land for Sale in Enugu
- Flats and Apartments for Sale in Enugu
- Property for Rent in Enugu
- Short Lets in Enugu
- Commercial Property in Enugu

The homepage, seller, verification and buying-from-abroad pages now have intent-specific titles and descriptions. Five priority area pages cover Independence Layout, Trans Ekulu, New Haven, GRA and Abakpa Nike. Other thin or empty area pages stay out of the sitemap and use `noindex, follow` when appropriate.

The Market Insights hub contains five sourced guides covering buying property, buying land safely, document checks, area research and buying from the UK or abroad. Guides show real publication and update dates, use the truthful Enugu Properties Editorial Team attribution, cite authoritative sources and link to relevant inventory.

## Technical SEO now active

- Production robots permits public crawling while excluding accounts, admin, API and authentication routes.
- Preview and Worker hosts return a blocking robots response plus `X-Robots-Tag: noindex, nofollow`.
- Canonicals, sitemap entries, internal links and redirects agree on the HTTPS apex domain.
- `www` redirects once to the apex domain.
- Arbitrary filter URLs use `noindex, follow`; page-only pagination is crawlable and self-canonical.
- The sitemap contains canonical public pages, qualifying areas, editorial guides, live properties, real `lastmod` values and property image entries.
- Missing routes return HTTP 404.
- Property slugs remain stable when price or availability changes.
- Property titles and descriptions are generated from structured facts instead of uncontrolled seller wording.
- Site-wide Organization and WebSite data is joined by CollectionPage, Article, BreadcrumbList, RealEstateListing and Offer structured data where applicable.
- The Organization address remains MAGENCY's truthful Lagos registered address; no Enugu office or social profile was invented.

## Editorial administration

The content editor now supports author, publication date, SEO title, meta description, social image, indexability and a production-domain-only canonical override. It includes a search-result preview and keeps ordinary publishing within the admin interface. The additive database migration is live on both staging and production.

## Indexing integrations

IndexNow is active for public property lifecycle changes and editorial publication. The key file is live on the production domain. The initial batch of priority URLs was accepted by IndexNow with HTTP 202 on 19 September 2026.

Google Search Console and Bing Webmaster Tools require owner-account verification. No access or performance data was fabricated. Exact owner steps are in the runbook; after verification, submit the production sitemap and record the first 28-day baseline.

## Media, performance and measurement

Property images appear in social metadata and image sitemap entries. Existing responsive image delivery and metadata-stripping uploads remain in place. Video structured data is deliberately deferred until reliable thumbnail, duration and upload-date fields exist.

The release avoids new third-party scripts. Field Core Web Vitals and organic conversion baselines require Search Console and analytics traffic; unavailable values are recorded as unavailable rather than zero. Future conversion measurement should cover enquiries, inspections, seller registrations, listing submissions, WhatsApp clicks and paid-plan purchases without exposing personal data.

## Verification evidence

- Next production build passed.
- TypeScript passed.
- ESLint passed with no errors.
- All 50 automated tests passed.
- Live robots, sitemap, commercial pages, editorial pages, seller page, verification page and property page returned the expected production metadata.
- A filtered search returned `noindex, follow`.
- A missing page returned 404.
- The preview Worker returned `noindex, nofollow`.
- The sitemap and checked public pages contained no `workers.dev` canonical URLs.
- The live homepage was reloaded at a mobile breakpoint and retained one clear H1, labelled search controls, accessible navigation, and no document-level horizontal overflow.

Synthetic Chrome trace tooling is not configured in the current development environment, so this report does not invent Lighthouse or Core Web Vitals figures. Search Console field data remains the required source for real-user LCP, INP and CLS after verification and sufficient traffic.

## Next 30 days

1. Verify the domain property in Google Search Console and Bing Webmaster Tools, then submit the sitemap.
2. Record indexed pages, impressions, clicks, queries, landing pages and Core Web Vitals after data becomes available.
3. Review listing titles, locations, photos and spam signals during moderation using the SEO quality checklist.
4. Improve the five area guides with verified local detail and fresh inventory as it appears.
5. Publish only reviewed additions to the initial guide cluster and monitor whether the commercial pages are being crawled and indexed.

## Next 90 days

1. Earn legitimate local references through developers, agencies, qualified property professionals, media and diaspora organisations.
2. Add first-party market observations only when minimum sample sizes and reliable status data make them defensible.
3. Add descriptive image-alt moderation and complete Stream video metadata before introducing VideoObject markup.
4. Add slug history and permanent redirects before editors can change public slugs.
5. Expand beyond the first Enugu pages only where inventory, demand and unique local value justify indexation.

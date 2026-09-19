# Current SEO audit — 19 September 2026

## Executive finding

The production site is functional and renders its primary content on the server, but the live SEO signals were blocking growth at the start of this project. `https://enuguproperties.com/robots.txt` returned `Disallow: /`; canonical links and every sitemap URL pointed to `https://enugu-properties.emailgalaxyway.workers.dev`. Search engines could therefore treat the staging hostname as canonical while being told not to crawl the production host.

This release removes the build-time environment dependency behind those signals. Canonical URLs and sitemap entries now use the fixed production origin, while preview hosts receive `X-Robots-Tag: noindex, nofollow` and a host-aware blocking robots response.

## Audit scope and findings

| Surface | Finding before implementation | Action |
|---|---|---|
| Canonical domain | `/properties` and category pages canonicalised to workers.dev | Fixed production origin and host-based preview protection |
| robots.txt | Production returned `Disallow: /` | Dynamic host-aware robots route |
| Sitemap | Contained workers.dev URLs and every area regardless of value | Production URLs, curated commercial pages, editorial pages, qualifying areas, image URLs and property `lastmod` |
| Homepage | Strong marketplace UX but generic title | Enugu sale/rent title, canonical and stronger category links |
| Commercial intent | Important intents existed only as query-string filters | Seven stable search-first landing pages |
| Facets | Query URLs were noindex, which was directionally correct | Retained noindex/follow for arbitrary filters; page-only pagination receives self-canonical URLs |
| Pagination | Page queries canonicalised to page 1 and were noindex | Page-only results now self-canonical and crawlable |
| Property pages | Stable slugs and update dates existed; metadata reused seller title | Structured fact metadata, OG images, breadcrumbs and `RealEstateListing` shape |
| Area pages | All areas were in the sitemap, including empty pages with limited content | Five researched guides plus inventory threshold; other empty areas use noindex/follow and stay out of sitemap |
| Structured data | Organisation markup only on homepage | Site-wide truthful Organization and WebSite data; breadcrumbs, collection pages, articles and listings |
| Editorial authority | Informational pages existed, but no guide hub | Market Insights hub and five reviewed-source guides |
| Content CMS | Title, introduction, body and published flag only | Author, dates, SEO title, meta description, social image, indexability, canonical override and preview |
| IndexNow | Not present | Automatic notification for public property status changes and editorial publication |
| 404 | Correct page template exists | Retained; automated regression coverage added around SEO helpers and configuration |
| Images | Responsive `next/image` cards and metadata-stripped uploads | Property images now appear in OG metadata and sitemap image entries; alt text still needs moderation support |
| Video | Public Cloudflare Stream embeds render lazily | VideoObject deferred until reliable thumbnail, duration and upload-date fields are available |
| Staging | Intended noindex behaviour depended on build-time variables | Preview hostname is now the deciding signal |

## Current route observations

- Property slugs include a stable reference, so price and status changes do not require URL changes.
- Public listings visibly expose price, purpose, area, bedrooms, bathrooms, land size, condition, verification scope and real update dates.
- Sold and rented adverts are labelled and remain useful without appearing available.
- Account, admin, API, login, registration, recovery and arbitrary filter URLs are excluded from indexable landing-page strategy.
- The current inventory is small. The site must not manufacture hundreds of type/area pages until inventory and unique local value justify them.

## Remaining technical work

- Measure production Core Web Vitals with Search Console field data after sufficient traffic exists.
- Record Stream video duration, thumbnail and upload date before adding VideoObject or video sitemap entries.
- Add moderation tooling for descriptive image alt text rather than deriving unverifiable scene descriptions.
- Consider sitemap indexes only after the URL set approaches operationally meaningful scale.
- Add slug history and permanent redirects before allowing public editorial or property slugs to change.

## Production acceptance checks

After deployment, verify:

1. `robots.txt` permits public crawling on the apex domain and blocks the preview worker.
2. all canonical and sitemap URLs use `https://enuguproperties.com`;
3. important pages return one useful H1, title and description;
4. filtered searches return noindex/follow;
5. property and guide structured data passes Schema.org validation;
6. missing URLs return HTTP 404;
7. `www` redirects once to the apex domain.

# Search Console, Bing and IndexNow runbook

## Google Search Console owner action

1. Open Google Search Console.
2. Add a **Domain property** for `enuguproperties.com`.
3. Copy the TXT verification value.
4. Add that TXT record to the Enugu Properties DNS zone in Cloudflare.
5. Complete verification in Search Console.
6. Submit `https://enuguproperties.com/sitemap.xml`.
7. Inspect the homepage, the seven commercial landing pages, five priority area pages, two live property pages and the Market Insights hub.
8. Request indexing only for the priority pages after the corrected robots and canonical release is live.

Monitor Pages/Indexing, Sitemaps, Core Web Vitals, HTTPS, manual actions, structured-data reports and search performance. Record exclusions by reason; do not try to force private, filtered or empty pages into the index.

## Bing Webmaster Tools owner action

1. Sign in to Bing Webmaster Tools.
2. Import the verified Search Console property where the current interface offers it, or use Bing’s supported verification method.
3. Submit `https://enuguproperties.com/sitemap.xml`.
4. Inspect representative commercial, area, article and property URLs.

## IndexNow implementation

The public key file is served from the production origin. Public property status changes and editorial publication notify IndexNow for the changed URL and sitemap. Failures are logged and do not block the user’s action. Private URLs are never submitted.

## Weekly checks for the first month

- robots and canonical still use the apex production domain;
- sitemap fetch succeeds and contains only canonical public URLs;
- priority pages move from discovered/crawled to indexed;
- no staging or workers.dev URLs appear as Google-selected canonicals;
- mobile rendering shows listings and guide copy without interaction;
- structured-data errors are investigated against visible page content.

# Enugu Properties Production Launch Report

Status: launched and verified on 14 September 2026.

## Domain

- Canonical site: `https://enuguproperties.com`
- `https://www.enuguproperties.com` permanently redirects to the apex with its path and query preserved.
- Cloudflare custom domains were attached to the production Worker.
- Existing Email Routing MX, DKIM and SPF records were preserved.

## Production deployment

- Worker: `enugu-properties-production`
- Launch version: `a7d51a30-6228-44ab-b6fe-c41b08ea71c4`
- Cloudflare version tag: `production-launch-2026-09-14`
- Public and private production R2 bindings are active.
- Five required production secrets were deployed with the launch version and are not stored in source control.
- Staging remains independently deployed as `enugu-properties`.

## Database

- Neon project: `crimson-resonance-38503224`
- Production branch: `br-steep-lab-zapw4pn0`
- Production endpoint: `ep-holy-sound-zaigrb4x`
- The production schema and configuration seed were applied successfully.
- Verification found 46 tables, 19 locations, 3 plans, 8 roles, 10 permissions and the expected property and quarantine controls.
- Launch data is clean: 0 profiles, 0 properties and 0 payment orders.
- Three approved legal snapshots are stored.
- No public application table was found without row-level security.
- The production Data API is enabled, its schema cache is current and private tables reject anonymous access.
- Neon history retention shown during launch: one day.

## Storage

- Public bucket: `enugu-properties-media`
- Private bucket: `enugu-properties-private`
- Property photographs use the public binding; evidence and quarantine objects use the private binding.

## Authentication

- Production Neon Auth is active.
- Trusted domains are `https://enuguproperties.com` and `https://www.enuguproperties.com`.
- Localhost access is disabled for production Auth.
- Public registration remains disabled until transactional email is configured.

## Email

- Cloudflare Email Routing records remain intact.
- A transactional email provider is not configured, so registration remains unavailable with a clear launch-period message.

## Turnstile

- The managed production widget is active for the apex, `www` and local development.
- The public site key is compiled into the production client.
- The private validation key is stored only as a Cloudflare Worker secret.
- The live contact page rendered and completed the managed challenge successfully.

## Payments and gated services

- Paystack remains in test mode.
- Paid listings, property-purchase payments, escrow, offers, transaction cases, transaction documents, legal due diligence, survey review, maps and video are disabled.
- Pricing and registration pages explain their current launch availability.

## Legal

- Approved Terms of Use, Privacy Policy and Seller Terms & Property Marketing Mandate are published.
- Each approved document has version and SHA-256 integrity metadata, and immutable snapshots are stored in the production database.

## SEO and security

- Production robots rules allow public crawling while excluding private routes.
- Staging retains global `noindex, nofollow` behavior and a root robots disallow rule.
- The production sitemap includes contact and all approved legal pages and contains no demo listings.
- Production responses include HSTS and canonical `Link` headers.
- Private account and admin routes redirect unauthenticated visitors to sign in.
- CSRF, maintenance-job authentication, webhook authentication and media protection checks passed.

## Validation

- TypeScript: passed.
- ESLint: passed.
- Automated tests: 31 passed.
- Vinext Cloudflare production build: passed with production-only configuration.
- Production smoke suite: 27 page routes plus health, redirects, indexing, security and feature-gate checks passed.
- Staging smoke suite: 27 page routes plus health, security and noindex checks passed.
- Live browser inspection confirmed the production homepage, empty-listing launch state and Turnstile-protected contact form render correctly.

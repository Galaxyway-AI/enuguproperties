# Implementation and release status

## Completed in this workspace

- Empty-repository assessment, Next.js/TypeScript application, local design system, responsive navigation and production build configuration.
- Homepage, paginated/filterable catalogue, property detail/gallery, area pages, pricing, seller, verification, safety, diaspora, contact and legal draft pages.
- Neon cookie authentication, confirmation/recovery flows, account profile and organisation forms.
- Database-backed listing drafts and edits, plan selection, photograph/private-evidence uploads, direct quarantined video upload and validation, advertising orders, seller agreement acceptance and moderated submission.
- Permission-controlled staff queues, property review, staff evidence, verification records, inspection assignment/completion, reports, support records, account status, editorial content, plans and locations.
- Buyer saves, enquiries, inspection requests and private offers. Transaction cases, immutable milestones, configurable mandate-based commission calculation and finance updates.
- Private/public data separation, RLS, current-user validation, MFA permissions, CSRF checks, persistent rate limiting, production bot checks, signed evidence downloads and immutable audit history.
- Payment webhook signature and server verification, idempotent database fulfilment, notification outbox and maintenance endpoint.

## Database

Five ordered migrations cover the relational foundation, workflow RPCs, private storage, operations/video processing and immutable release controls. Idempotent seed configuration contains provisional plans, locations, permission mapping and verification/document types. There are no seeded real accounts, active legal agreements or fabricated verification badges.

## Validation

- TypeScript, lint and production build completed successfully. The final automated suite contains 23 passing checks, including native video processing.
- PostgreSQL tests exercise real migrations with test-only Auth claims and roles in PGlite. Coverage includes unauthorised publication/role changes, seller isolation, private evidence, staff MFA, material-change invalidation, payment amount/idempotency, expiry, inspection evidence, transaction ordering, commissions, history immutability and video allowances.
- Monetary representation and internal auth redirects have unit coverage. Payment HMAC and native video metadata processing have additional tests.
- HTTP smoke: 26 routes plus missing-page, CSRF, job secret, invalid webhook and private media checks passed.
- Browser: desktop and 390px mobile visual review, working category/area search, sample property detail, photo dialog, Escape dismissal and restored keyboard focus. Images load locally.

## Not yet verified / not production-ready

The Neon development branch and Cloudflare storage now exist, but transactional email, Turnstile and Paystack test credentials are not configured. Real email registration/recovery, R2 upload/download expiry, paid checkout and email delivery have **not** been exercised end to end. The local checks must not be represented as production security certification.

The full 132-section brief is broader than this initial implementation. Remaining product work includes fuller property-specific fields and filters, dedicated renewals/reminders, granular permission administration, richer organisation/compliance records, staff people pickers, seller analytics and notification preferences, complete agreement/negotiated-mandate/provider administration, transaction document-sharing controls, and large-inventory sitemap batching. Main staff queues support search and pagination; account lists and the separate support/commission screens currently show the newest 50 records. Optional maps are not enabled.

Production also requires approved legal text and operating details, evidence retention/data-rights procedures, malware scanning, backups/restore validation, monitoring and authenticated staging E2E across the target mobile browsers. These are explicit release requirements, not hidden assumptions.

## Decisions / configuration needed

Complete Neon Data API and trusted-domain configuration, add test integration secrets, confirm business contact details, and provide professionally approved seller/legal wording and operational verification procedures before production launch.

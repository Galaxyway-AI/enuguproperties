# Enugu Properties

A Next.js / TypeScript property marketplace for MAGENCY ONLINE SOLUTIONS LTD, with Neon PostgreSQL/Auth and Cloudflare Workers/R2. Advertising, moderation and verification are separate database workflows. The repository is configured for local Next.js development and a Cloudflare staging deployment; a production launch still requires the operational items below.

## Local preview

Requires Node.js 22 or later and npm. Dependencies are locked in `package-lock.json`.

```sh
npm ci
# Copy .env.example to .env.local and set the required values.
npm run dev
```

Open http://127.0.0.1:3000. `DEMO_MODE=true` enables visibly labelled fictional public inventory only in development when Neon Data API access is absent. It never provides fake account, payment, admin or verification success. Production ignores demo mode. Fonts and illustrative photographs are served locally.

## Connect the backend

1. Create a Neon project with Neon Auth, then keep separate `production` and `development` branches.
2. Put the development branch connection string in `DATABASE_URL`, set `NEON_AUTH_BASE_URL`/`NEXT_PUBLIC_NEON_AUTH_URL`, and generate a stable 32+ character `NEON_AUTH_COOKIE_SECRET`.
3. Run `npm run db:build-migration`, `npm run db:migrate`, then `npm run db:verify`. The generated Neon migration is retained in `neon/migrations/`; the original portable PostgreSQL workflow files remain in `supabase/migrations/`.
4. Enable Neon Data API for the intended branch, set `NEON_DATA_API_URL` and `NEXT_PUBLIC_NEON_DATA_API_URL`, and add the exact local/staging/production origins to Neon Auth trusted domains. Configure transactional email before testing verification and recovery links.
5. Register the intended first administrator normally. A database administrator then inserts that **actual user UUID** into `user_roles` with `super_admin`. No default administrative user or password is seeded. Enrol and verify TOTP at `/account/security` before staff access.
6. Publish a solicitor-reviewed seller agreement in `agreement_versions` with its immutable version, SHA-256 document hash, `legal_approved=true` and `active=true`. The application intentionally refuses contractual submission before approved terms exist.

The seed contains locations, roles, permissions, verification types, document categories and provisional advertising plans. It contains no real identities, fake legal credentials or active seller agreement. See [architecture](docs/architecture.md) and [business rules](docs/business-rules.md).

## Environment configuration

All keys and contact placeholders are in `.env.example`:

- `NEXT_PUBLIC_APP_URL`: exact public origin, also used for CSRF and auth redirects.
- `DATABASE_URL`: private PostgreSQL connection used only by migration and administrative scripts.
- Neon Auth and Data API URLs: branch-specific endpoints. The cookie secret and database connection stay server-side.
- `PAYSTACK_SECRET_KEY`: test secret during development. No payment is initiated when absent. Paystack uses this same secret for HMAC webhook verification; there is no invented separate webhook secret.
- `EMAIL_API_KEY`, `EMAIL_FROM`: Resend adapter for notification delivery. Neon Auth email uses its separately configured provider.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`: bot protection. Public production forms fail closed if missing.
- `CRON_SECRET`: random, high-entropy bearer secret for maintenance and the email outbox.
- Company registration/address/support/WhatsApp placeholders: fill only with confirmed business details.
- `MAPBOX_ACCESS_TOKEN`: reserved for a future optional map implementation. Public area-only location currently requires no map provider.

## Storage and videos

Cloudflare R2 uses separate private buckets for development and production. No public bucket URL is configured. Public photographs continue through a narrow delivery endpoint that checks publication; private documents require an authorised session.

Photos are decoded in the browser, resized to 2400 px and rendered to WebP without source EXIF or XMP metadata. The Worker independently validates the WebP structure, dimensions, descriptive metadata flags and animation state before private storage; a bounded colour profile is retained for accurate display. Evidence accepts images or flat PDFs up to 12 MB. PDF active-feature rejection is a preliminary check, not a malware scanner; deploy malware scanning before accepting untrusted production documents at scale.

Videos upload directly to a private quarantine bucket using a signed upload token. Server processing validates size, duration and H.264 content with ffprobe, strips metadata with ffmpeg and atomically enforces the plan allowance. Limits are 100 MB and the plan duration, default 120 seconds. Use a Node host with native binaries, adequate temporary storage, and a request/job duration of at least 180 seconds. This implementation is not compatible with an edge-only runtime.

## Payments and email testing

Use a Paystack test secret and configure `/api/payments/webhook` at an externally reachable staging origin. Initialise an advertising order from an owned draft. Verify a test charge, a duplicate webhook, an invalid signature, wrong currency and wrong amount. Returning from checkout alone must never mark an order paid or publish a property.

Call `POST /api/jobs` with `Authorization: Bearer <CRON_SECRET>` from a Cloudflare Cron Trigger every five minutes. It expires listings/checks, cleans old video reservations and retries notification email. The email adapter uses a stable provider idempotency key. Validate sender authentication and delivery in staging. No emails were sent as part of local development.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npm run build
node scripts/smoke.mjs # while the local server runs
```

Tests run PostgreSQL in PGlite with a test-only Auth schema, roles and claims. They execute real migrations and RLS policies; they do not replace a staging test against Neon Auth/Data API, R2 and Paystack. Browser checks cover desktop/mobile public navigation, filters, gallery and setup gates. [Release status](docs/progress.md) records what was and was not verified.

## Deployment

See [deployment](docs/deployment.md). The application has not been deployed. Review professional/legal operational requirements, configure integrations and complete staging acceptance before launch. Run `npm run start` behind a TLS reverse proxy after a successful build. Never commit `.env.local`, service credentials or production document data.

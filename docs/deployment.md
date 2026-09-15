# Deployment runbook

The application has two build targets: standard Next.js for local development and vinext for Cloudflare Workers. Cloudflare hosts the application and private R2 media; Neon provides branchable PostgreSQL and Auth. Browsers resize photographs and remove source EXIF/XMP metadata by rendering them to WebP. The Worker independently validates the resulting WebP container before storage, rejecting descriptive metadata and animation while allowing a bounded colour profile. Native ffmpeg processing remains available only in the Node development target; move video sanitisation to Cloudflare Stream or a dedicated processing service before enabling production video uploads.

## Staging first

1. Use the Neon `development` branch for staging and retain the protected `production` branch for release. Apply versioned migrations and verify the seed counts.
2. Configure Neon Auth email confirmation, SMTP, trusted domains and staff MFA. Register and assign real staff users; test each role using its own account.
3. Use `enugu-properties-media-dev` for staging and `enugu-properties-media` for production. Verify unauthenticated reads fail. Upload MIME mismatches, oversized files and interrupted uploads. Confirm evidence links expire.
4. Configure Paystack test credentials/webhook and the email provider. Verify duplicate delivery, wrong amounts, failed payments and retry recovery. Never use live keys for acceptance testing.
5. Add Turnstile site/secret keys for the exact domain. Store secrets with Wrangler, set the canonical origin, and keep database credentials out of build output and Git.
6. Run type checking, lint, database tests, production build and HTTP smoke checks. Complete authenticated browser E2E against this configured staging environment.
7. Publish professionally reviewed legal agreements and confirm company details. Review applicable Nigerian privacy, AML/SCUML and professional activity obligations with qualified advisers. Configure evidence retention and a deletion/anonymisation procedure.

## Release

Restore-test the Neon branch before release. Apply migrations before new code. Build with `npm run build:vinext`, deploy with `npm run deploy:vinext`, keep `DEMO_MODE=false`, configure the maintenance Cron Trigger, and check public plus protected routes. Keep `DATABASE_URL`, `NEON_AUTH_COOKIE_SECRET`, Paystack and email credentials in Worker secrets. Never log provider bodies or upload contents.

Monitor error counts, pending emails, video-processing failures, aged pending orders and job execution. Send redacted JSON logs to the chosen monitoring sink and add an uptime probe. Confirm rate-limit storage and storage lifecycle cleanup under realistic load. Maintain a rollback plan for code; do not blindly reverse data migrations.

Release blockers are tracked in `docs/progress.md` and must be closed before claiming production readiness.

# Stage 2.5 integration results

Last updated: 14 September 2026. This report records evidence, not intended configuration. No secrets or customer content belong here.

| Integration       | Status       | Evidence / blocker                                                                                                                                                                                                |
| ----------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email             | Blocked      | Resend adapter and retrying outbox are implemented. The deployed staging Worker has no email secret, and verified-domain delivery has not been exercised.                                                         |
| Turnstile         | Blocked      | Hostname, action, expiry/failure and replay controls are implemented. The deployed staging Worker has no Turnstile secret.                                                                                        |
| Kora TEST         | Proven       | Kora accepted a sandbox Checkout Redirect request with the Enugu Properties return and notification URLs. Signed webhook, server verification, amount/currency checks and idempotent fulfilment are implemented. |
| Public R2         | Blocked      | The `enugu-properties-media-dev` bucket exists in Western Europe and is empty. Image transformation is implemented, but an external upload/gallery test needs working staging auth and database configuration.    |
| Private R2        | Blocked      | Authenticated access, quarantine state, clean-only 60-second evidence links and audit logging exist. Cross-account and expiry tests still require deployed accounts and R2.                                       |
| Video             | Disabled     | `FEATURE_VIDEO=false`; the UI is hidden and `/api/video` returns 404. Native video processing is not compatible with this Cloudflare Worker release.                                                              |
| Neon              | Staging pass | Data API and Neon Auth are active on development branch `br-dry-math-zaik27fq`. The staging origin is trusted. Anonymous-token checks return 200 only for intended catalogue resources and 403 for private data. |
| Backup restore    | Blocked      | Runbook exists. A safe Neon test branch and confirmation of plan retention features are required.                                                                                                                 |
| Cloudflare Worker | Staging pass | Version `ecff143b-e852-4091-9515-6bcdf204d4c1` is deployed with the development Neon endpoint, private R2 binding and four required core secrets. The 26-route staging smoke suite passes.                         |
| Monitoring        | Partial pass | Structured errors, job-run history and staff health diagnostics exist. Alert delivery and controlled failure visibility remain untested.                                                                          |
| Mobile            | Partial pass | Responsive layout and local route smoke tests pass. Authenticated physical-device seller and buyer journeys remain untested.                                                                                      |
| Security tests    | Partial pass | All 30 local checks pass. Deployed checks prove public/private Data API boundaries, a real 404, CSRF rejection, protected routes, webhook/job authentication, media rejection and staging noindex controls.       |

## Current assessment

The payment integration has passed sandbox checkout initialization. Remaining beta-readiness claims still depend on the separate email, Turnstile, authenticated R2, Neon recovery and operator-alert checks recorded elsewhere. Code paths fail closed when required configuration is absent.

## Staging release evidence

- Worker URL: `https://enugu-properties.emailgalaxyway.workers.dev`
- Current version: `ecff143b-e852-4091-9515-6bcdf204d4c1`
- Previous rollback candidate: `a5eda491-f16b-4e3b-8eae-2bf8f8c8656c`
- Data API: `https://ep-crimson-block-za1a50ot.apirest.c-2.eu-west-2.aws.neon.tech/neondb/rest/v1`
- Noindex: homepage returns `X-Robots-Tag: noindex, nofollow`; `robots.txt` disallows `/`.
- Secrets present by binding name only: `DATABASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `CRON_SECRET`, `MEDIA_SIGNING_SECRET`.

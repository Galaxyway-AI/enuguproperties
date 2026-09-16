# Security design and release checks

## Data boundaries

Public catalogue queries use `public_properties`, an intentionally owner-executed view with explicit public columns and publication/account predicates. Raw properties, exact locations, evidence paths and user contacts are not anonymously readable. Every public table has RLS enabled. Browser roles receive read permissions only; writes pass through narrowly scoped security-definer functions with fixed empty search paths and explicit caller checks.

`app_private.has_permission` maps roles to capabilities and requires an active account plus an `aal2` JWT. No client-supplied role, verification, plan-price or publication field is trusted. Staff cannot approve their own property. Service-role functions are explicitly revoked from public, anon and authenticated roles.

## Files

Buckets stay private. Private document lookup runs with the user's RLS context before the server signs a one-minute download and records access. Public media delivery requires a public catalogue record. Private media uses `private, no-store`; do not place it behind a shared caching rule. Quarantine video keys are unpredictable and cannot be publicly downloaded. Limit enforcement happens under a property row lock.

## Application

Cookie sessions are validated with Neon Auth and Data API JWTs feed the existing PostgreSQL RLS policies. Mutations check the configured Origin. Server inputs use Zod and database constraints. Rich text is rendered as text rather than injected HTML. CSP restricts script/frame sources; object embedding and framing are disabled. Persistent database rate limits protect auth and mutations; production public forms additionally require Turnstile. Staff access requires MFA. Logs omit request contents, private files and credentials.

Kora webhooks use timing-safe HMAC-SHA256 checks over the event data object and an independent server-side verification request. Amount, currency, reference and provider ID are matched under lock; duplicate delivery cannot issue a second fulfilment. A redirect is never proof of payment.

## Required staging checks

PGlite tests cover actual SQL permissions but do not reproduce Neon Auth/Data API or R2. Before launch, test real JWT claims and refresh/recovery, R2 access and signed URL expiry, all role boundaries through the Data API, payment test webhooks, anti-abuse limits, and processor failure recovery. Configure backups, restoration exercises, monitoring and a malware scanning pipeline. Finalise evidence retention, data subject requests and legal/AML requirements with appropriate Nigerian professionals.

Do not expose diagnostic errors or verbose provider payloads publicly. Do not disable RLS to make a failing feature work. Review CSP `unsafe-inline` compatibility with Next hydration and adopt nonce-based scripts as a further hardening step before a high-volume launch.

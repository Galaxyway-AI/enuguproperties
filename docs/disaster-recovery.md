# Disaster recovery runbook

Use this runbook only with an identified environment, named incident lead and recorded start time. Never restore over active staging or production until the target branch and recovery point have been verified.

## Database corruption or accidental deletion

1. Put affected write workflows into maintenance mode and preserve logs.
2. Identify the Neon project, branch, last known good time and the account plan's actual restore window.
3. Create a recovery branch from the supported history point; do not overwrite the affected branch.
4. run `npm run db:verify` against the recovery branch, then compare critical counts and a known record.
5. Point a temporary application environment at the recovery branch and test authentication plus read/write behavior.
6. Promote connectivity only after two-person review. Record elapsed time and any unrecoverable interval.

## Bad migration

Stop deployment. Preserve the failed migration output. Prefer a forward corrective migration. If data integrity is at risk, recover to a new Neon branch from the pre-migration point, verify it, and roll application code back to the compatible Cloudflare version. Never edit a migration already applied to a shared environment.

## R2 media problem

Disable affected uploads, retain object keys and audit records, and confirm whether the fault is access policy, object loss or processing. Restore objects from the configured copy/versioning process if available. Do not make a private bucket public as a recovery shortcut.

## Lost or rotated secret

Revoke the old credential at its provider, add the replacement through Cloudflare secret management, deploy a new version and test the narrow integration. Rotate related credentials if exposure is possible. Never paste secret values into incident notes.

## Payment webhook failure

Keep orders pending. Restore webhook delivery, validate signatures and query Paystack server-side before replaying. Database fulfilment is idempotent. Reconcile reference, amount and NGN currency before changing any order state.

## Email provider failure

Business events remain committed in the notification outbox. Restore provider configuration and allow scheduled retries. Monitor aged pending records; do not recreate the underlying property or inspection event.

## Cloudflare deployment rollback

Select the last known good Worker version, confirm its schema compatibility, roll back through Cloudflare version management, and smoke-test public, authentication and protected routes. Forward-fix the database where a down migration could lose data.

## Required restore exercise

Before beta, create an isolated Neon test branch, insert a uniquely identified test record, establish a supported recovery point, alter the record, recover into another branch, verify the original value and reconnect a temporary deployment. Record provider feature, retention window, start/end time and screenshots or run IDs without secrets.

# Monitoring and alerting

The public `GET /api/health` response exposes only service availability. Signed-in staff with the audit permission can request `GET /api/health?detail=operations` to see the latest maintenance run, repeated email retries and the document review queue. Responses are never cached.

Cloudflare should alert the operational owner when Worker error rate rises, the health endpoint fails, or scheduled maintenance returns a non-2xx response. The maintenance route stores each run in `job_runs`; failures log a structured `maintenance_failed` event without customer data. Alert delivery remains a release blocker until it has been triggered and acknowledged in staging.

Review daily during beta: failed requests, last successful maintenance time, emails with three or more attempts, documents awaiting review, authentication failures, payment webhook failures and storage errors. Never place document names, email addresses, phone numbers, tokens or request bodies in logs or alerts.

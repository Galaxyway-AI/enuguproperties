# Verification model

Types: identity, authority to market, site inspection, documents, official search, survey and legal due diligence. States: requested, in progress, more information required, completed, failed, expired and cancelled.

Every record belongs to a specific property revision and includes the reviewer, private evidence, public summary, notes/outcome, optional professional provider and optional expiry. Public projection returns only completed results on the current revision whose expiry has not elapsed. No evidence storage key, inspector identity or private note appears in that projection.

Completion requires a document and meaningful summary/notes. Identity review requires compliance. Survey/legal review requires a confirmed professional provider. Site review must point to an inspector-owned evidence document associated with a completed assigned inspection after the property's latest update. The officer's decision is recorded in immutable audit history.

Material edits preserve the prior revision, return live inventory to review and expire previous checks. This initial implementation deliberately invalidates all completed checks on an edit; targeted per-field invalidation can later refine this without weakening the default.

The `/verification` page explains each check's meaning and limits. No check promises guaranteed legal title, and no advertising plan supplies a verification badge.

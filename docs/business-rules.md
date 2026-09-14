# Business rules

- **Advertising:** Free/Plus/Premium are seeded at ₦0/₦5,000/₦15,000 for 30/45/60 days, with 4/15/30 photos and 0/1/3 videos. Settings are database-driven. Each selected/paid plan is snapshotted. Featured placement is labelled advertising and never changes verification.
- **Publication:** seller drafts → submitted → staff review → live / needs changes / rejected. Only an independent MFA-authenticated moderator can approve. Payment returns a draft to the seller for submission, not publication.
- **Submission:** requires an active profile, sufficient description, a photo, property evidence, active plan, payment where required and an approved versioned agreement. Active video processing blocks submission.
- **Revisions:** edits retain the old property snapshot and price history. Published/paused/under-offer edits return to review; all completed verification checks expire conservatively. The canonical slug remains stable.
- **Verification:** each result has a type, state, officer, evidence, summary, revision and dates. Identity requires compliance permission; professional checks require a confirmed provider; site checks require an inspector-owned evidence record for the completed inspection. No badge is seeded for fictional examples.
- **Expiry:** approval sets a concrete expiry timestamp from the plan snapshot. Public search excludes elapsed availability before a scheduler runs. Maintenance is repeatable. Sold and expired pages may remain as inactive pages.
- **Enquiries:** the platform owns the introduction record. Public DTOs contain no seller phone number. Buyer requests and offers are private, with role-restricted staff access.
- **Transactions:** sequential case stages culminate in recorded external completion. Offers and milestones have immutable histories. No escrow, property deposit checkout or purchase-money wallet exists.
- **Commission:** the seed default is 200 basis points, stored in settings and snapshotted into an accepted mandate. Percentage/fixed/waived arrangements exist in the model. Completion calculates the recorded mandate with PostgreSQL numeric arithmetic; finance records invoicing/settlement separately. No automatic card charge.
- **History:** audit logs, revisions, offer events, transaction events and agreement acceptances cannot be rewritten. Agreement availability can change, but historical wording, hash and version cannot.
- **Development data:** fictional inventory is a separate opt-in development module, not a production database fallback. Sample actions cannot produce a real lead, offer, purchase or verification.

## Current release boundaries

Advanced seller analytics, saved-search alerts, map visualisation, professional self-service, automated valuations and real-estate escrow are not enabled. Negotiated mandate amendments and provider credential registration require an authorised operational/database process until dedicated editing interfaces are added. Renewal currently uses the draft/plan/submission workflow; a dedicated renewal checkout and reminder experience needs further acceptance work.

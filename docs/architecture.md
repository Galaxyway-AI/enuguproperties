# Implementation approach

The repository was empty on 14 September 2026: no reusable components, application, credentials or dependencies existed. The implemented stack is Next.js App Router/TypeScript with Neon PostgreSQL and cookie-based Neon Auth, deployed through vinext on Cloudflare Workers with private R2 storage. Public pages are server rendered and interactive forms and galleries remain small client components.

## Trust boundaries

Public catalogue queries read an explicit public projection, never raw private property records. PostgreSQL owns state transitions, permission checks, immutable audit events, plan snapshots, payment fulfilment, and verification invalidation. RLS denies access by default. Sensitive coordinates and evidence occupy separate private relations/storage. Staff permissions are mapped in the database, with MFA required for staff operations. Service credentials are restricted to webhook/job/upload orchestration.

## Delivery sequence

1. Schema, permission/state-machine foundation, auth, design tokens.
2. Public home/search/detail/area/editorial routes and clearly labelled development examples.
3. Persisted seller drafts, validated uploads, plans and payment adapter.
4. Staff moderation, evidence-based verification and audit workflow.
5. Buyer saves, enquiries, inspections, offers and transaction tracking.
6. Security tests, responsive browser QA, build, release documentation.

Without complete Neon endpoints and production secrets, public development examples are explicitly labelled; account and mutation endpoints fail closed rather than simulate success. Production does not fall back to sample inventory.

import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const sql = neon(process.env.DATABASE_URL);

const [result] = await sql`
  select
    (select count(*)::int from public.profiles) as profiles,
    (select count(*)::int from public.properties) as properties,
    (select count(*)::int from public.orders) as payment_orders,
    (select count(*)::int from public.agreement_versions
      where active and legal_approved
        and kind in ('terms','privacy','seller')) as active_legal_documents,
    (select count(*)::int from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r' and not c.relrowsecurity) as tables_without_rls
`;

if (
  result.profiles !== 0 ||
  result.properties !== 0 ||
  result.payment_orders !== 0 ||
  result.active_legal_documents !== 3 ||
  result.tables_without_rls !== 0
)
  throw new Error("Production data-safety verification failed.");

console.log(
  `Production data safe: ${result.profiles} profiles, ${result.properties} properties, ${result.payment_orders} payment orders, ${result.active_legal_documents} approved legal documents, ${result.tables_without_rls} public tables without RLS.`,
);

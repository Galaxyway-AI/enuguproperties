import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const [schema] = await sql`
  select
    (select count(*)::int from information_schema.tables where table_schema = 'public') as tables,
    (select count(*)::int from public.locations) as locations,
    (select count(*)::int from public.listing_plans) as plans,
    (select count(*)::int from public.roles) as roles,
    (select count(*)::int from public.permissions) as permissions
`;

if (
  schema.tables < 30 ||
  schema.locations < 1 ||
  schema.plans < 1 ||
  schema.roles < 1 ||
  schema.permissions < 1
) {
  throw new Error("Neon schema verification failed.");
}

console.log(
  `Neon ready: ${schema.tables} tables, ${schema.locations} locations, ${schema.plans} plans, ${schema.roles} roles, ${schema.permissions} permissions.`,
);

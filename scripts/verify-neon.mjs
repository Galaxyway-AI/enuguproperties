import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const [schema] = await sql`
  select
    (select count(*)::int from information_schema.tables where table_schema = 'public') as tables,
    (select count(*)::int from public.locations) as locations,
    (select count(*)::int from public.listing_plans) as plans,
    (select count(*)::int from public.roles) as roles,
    (select count(*)::int from public.permissions) as permissions,
    (select count(*)::int from information_schema.columns
      where table_schema = 'public' and table_name = 'properties'
      and column_name in ('property_type','negotiable','toilets','living_rooms','parking_spaces','building_sqm','property_condition','furnishing','details')) as property_detail_columns,
    (select count(*)::int from information_schema.columns
      where table_schema = 'public' and table_name = 'property_documents'
      and column_name in ('scan_status','scanned_at','scanner_reference')) as document_scan_columns,
    (select count(*)::int from information_schema.tables where table_schema='public' and table_name='job_runs') as job_run_table
`;

if (
  schema.tables < 30 ||
  schema.locations < 1 ||
  schema.plans < 1 ||
  schema.roles < 1 ||
  schema.permissions < 1 ||
  schema.property_detail_columns !== 9 ||
  schema.document_scan_columns !== 3 ||
  schema.job_run_table !== 1
) {
  throw new Error("Neon schema verification failed.");
}

console.log(
  `Neon ready: ${schema.tables} tables, ${schema.locations} locations, ${schema.plans} plans, ${schema.roles} roles, ${schema.permissions} permissions, ${schema.property_detail_columns} structured property columns and quarantine/job controls.`,
);

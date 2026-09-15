import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const connection = new URL(process.env.DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query(`
    select
      current_database() database_name,
      current_user database_role,
      current_setting('server_version') server_version,
      (select count(*)::int from information_schema.tables where table_schema='public') public_tables,
      (select count(*)::int from information_schema.tables where table_schema='neon_auth') auth_tables,
      exists(select 1 from information_schema.tables where table_schema='public' and table_name='properties') has_properties,
      (select jsonb_object_agg(expected.name, columns.column_name is not null)
        from (values ('property_type'),('negotiable'),('toilets'),('living_rooms'),('parking_spaces'),('building_sqm'),('property_condition'),('furnishing'),('details')) expected(name)
        left join information_schema.columns columns on columns.table_schema='public' and columns.table_name='properties' and columns.column_name=expected.name) property_detail_markers,
      (select jsonb_object_agg(expected.name, columns.column_name is not null)
        from (values ('scan_status'),('scanned_at'),('scanner_reference')) expected(name)
        left join information_schema.columns columns on columns.table_schema='public' and columns.table_name='property_documents' and columns.column_name=expected.name) document_markers,
      (select jsonb_object_agg(expected.name, columns.column_name is not null)
        from (values ('beta_participant'),('beta_kind')) expected(name)
        left join information_schema.columns columns on columns.table_schema='public' and columns.table_name='profiles' and columns.column_name=expected.name) beta_markers,
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='property_documents' and column_name='scan_status') has_quarantine,
      exists(select 1 from information_schema.tables where table_schema='public' and table_name='job_runs') has_job_runs
  `);
  console.log(
    JSON.stringify(
      {
        endpoint: connection.hostname,
        ssl: connection.searchParams.get("sslmode") || "provider default",
        ...rows[0],
      },
      null,
      2,
    ),
  );
} finally {
  await client.end();
}

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`
  select table_name, column_name, data_type
  from information_schema.columns
  where table_schema = 'neon_auth'
  order by table_name, ordinal_position
`;

const roles = await sql`
  select rolname
  from pg_roles
  where rolname in ('anon', 'anonymous', 'authenticated', 'service_role')
  order by rolname
`;

console.log(JSON.stringify({ authColumns: rows, roles }));

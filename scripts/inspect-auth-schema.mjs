import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const sql = neon(process.env.DATABASE_URL);
const rows = await sql.query(
  "select table_schema,table_name,column_name from information_schema.columns where table_schema in ('auth','neon_auth') and (column_name ilike '%email%' or column_name in ('id','name')) order by table_schema,table_name,ordinal_position",
);
console.log(JSON.stringify(rows));

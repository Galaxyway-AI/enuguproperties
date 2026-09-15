import { readFile } from "node:fs/promises";
import pg from "pg";

const requiredHost = "ep-crimson-block-za1a50ot-pooler.c-2.eu-west-2.aws.neon.tech";
const requiredAuthHost =
  "ep-crimson-block-za1a50ot.neonauth.c-2.eu-west-2.aws.neon.tech";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
if (new URL(process.env.DATABASE_URL).hostname !== requiredHost)
  throw new Error("Refusing migration: this is not the confirmed staging endpoint");
if (
  !process.env.NEON_AUTH_BASE_URL ||
  new URL(process.env.NEON_AUTH_BASE_URL).hostname !== requiredAuthHost
)
  throw new Error("Refusing migration: database and staging Auth do not match");

const phase = process.argv[2];
const file =
  phase === "handoff"
    ? "supabase/migrations/0008_data_api_role_handoff.sql"
    : phase === "inherit"
      ? "supabase/migrations/0009_data_api_role_inheritance.sql"
      : phase === "app-auth"
        ? "supabase/migrations/0010_data_api_auth_compatibility.sql"
      : null;
if (!file)
  throw new Error(
    "Usage: migrate-staging-data-api-roles.mjs handoff|inherit|app-auth",
  );

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("begin");
  await client.query(await readFile(file, "utf8"));
  await client.query("commit");

  const { rows } = await client.query(`
    select rolname, rolinherit
    from pg_roles
    where rolname in ('anonymous', 'authenticated', 'anonymous_legacy', 'authenticated_legacy')
    order by rolname
  `);
  console.log(JSON.stringify({ target: "staging", phase, roles: rows }, null, 2));
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

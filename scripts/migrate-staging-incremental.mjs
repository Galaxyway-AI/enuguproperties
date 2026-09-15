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

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const markerCount = async (migration) => {
  const query =
    migration === "0006"
      ? `select count(*)::int n from information_schema.columns
         where table_schema='public' and table_name='properties'
         and column_name in ('property_type','negotiable','toilets','living_rooms','parking_spaces','building_sqm','property_condition','furnishing','details')`
      : `select
          (select count(*)::int from information_schema.columns where table_schema='public' and table_name='property_documents' and column_name in ('scan_status','scanned_at','scanner_reference')) +
          (select count(*)::int from information_schema.columns where table_schema='public' and table_name='profiles' and column_name in ('beta_participant','beta_kind')) +
          (select count(*)::int from information_schema.columns where table_schema='public' and table_name='verification_types' and column_name='availability') +
          (select count(*)::int from information_schema.tables where table_schema='public' and table_name='job_runs') n`;
  return (await client.query(query)).rows[0].n;
};

try {
  const before6 = await markerCount("0006");
  const before7 = await markerCount("0007");
  if (![0, 8, 9].includes(before6) || ![0, 7].includes(before7))
    throw new Error("Refusing migration: partial migration markers detected");

  const applied = [];
  await client.query("begin");
  if (before6 < 9) {
    await client.query(
      await readFile("supabase/migrations/0006_property_details.sql", "utf8"),
    );
    applied.push("0006_property_details.sql");
  }
  if (before7 === 0) {
    await client.query(
      await readFile("supabase/migrations/0007_beta_operations.sql", "utf8"),
    );
    applied.push("0007_beta_operations.sql");
  }
  await client.query("commit");

  const after6 = await markerCount("0006");
  const after7 = await markerCount("0007");
  if (after6 !== 9 || after7 !== 7)
    throw new Error("Migration marker verification failed");
  console.log(JSON.stringify({ target: "staging", applied, markers: { stage2: after6, stage25: after7 } }));
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

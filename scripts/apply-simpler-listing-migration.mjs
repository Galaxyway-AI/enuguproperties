import { readFile } from "node:fs/promises";
import pg from "pg";

const hosts = {
  staging: "ep-crimson-block-za1a50ot-pooler.c-2.eu-west-2.aws.neon.tech",
  production: "ep-holy-sound-zaigrb4x-pooler.c-2.eu-west-2.aws.neon.tech",
};
const environment = process.argv[2];
if (!(environment in hosts)) throw new Error("Choose staging or production.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
if (new URL(process.env.DATABASE_URL).hostname !== hosts[environment])
  throw new Error(`Refusing migration: database is not ${environment}.`);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const migration = await readFile("supabase/migrations/0021_simpler_listing.sql", "utf8");
  await client.query("begin");
  await client.query(migration);
  await client.query("commit");
  const check = await client.query(`
    select (select is_nullable = 'YES' from information_schema.columns
      where table_schema='public' and table_name='properties' and column_name='land_sqm') as optional_land,
      exists(select 1 from pg_trigger where tgname='default_first_listing_plus' and not tgisinternal) as plus_trigger
  `);
  if (!check.rows[0].optional_land || !check.rows[0].plus_trigger)
    throw new Error("Listing migration verification failed.");
  console.log(`${environment} simpler listing migration applied and verified.`);
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

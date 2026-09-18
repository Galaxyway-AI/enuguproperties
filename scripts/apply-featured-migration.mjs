import { readFile } from "node:fs/promises";
import pg from "pg";

const targets = {
  staging: "ep-crimson-block-za1a50ot-pooler.c-2.eu-west-2.aws.neon.tech",
  production: "ep-holy-sound-zaigrb4x-pooler.c-2.eu-west-2.aws.neon.tech",
};
const environment = process.argv[2];
if (!(environment in targets))
  throw new Error("Choose staging or production.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const connection = new URL(process.env.DATABASE_URL);
if (connection.hostname !== targets[environment])
  throw new Error(`Refusing migration: database is not ${environment}.`);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const marker = await client.query(
    "select to_regprocedure('public.create_featured_order(uuid)') is not null applied",
  );
  if (marker.rows[0].applied) {
    console.log(`${environment} featured advertising migration already applied.`);
    process.exitCode = 0;
  } else {
    const migration = (
      await readFile("supabase/migrations/0019_featured_advertising.sql", "utf8")
    )
      .replace(/(?<![a-zA-Z0-9_])auth\.uid\(\)/g, "app_auth.uid()")
      .replace(/(?<![a-zA-Z0-9_])auth\.jwt\(\)/g, "app_auth.jwt()");
    await client.query("begin");
    await client.query(migration);
    await client.query("commit");
    const verified = await client.query(`
      select
        to_regprocedure('public.create_featured_order(uuid)') is not null create_order,
        to_regprocedure('public.featured_status(uuid)') is not null status,
        to_regprocedure('public.homepage_properties(integer)') is not null homepage,
        exists(select 1 from information_schema.columns where table_schema='public' and table_name='promotions' and column_name='order_id') promotion_order
    `);
    if (!Object.values(verified.rows[0]).every(Boolean))
      throw new Error("Featured advertising migration verification failed.");
    console.log(`${environment} featured advertising migration applied and verified.`);
  }
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

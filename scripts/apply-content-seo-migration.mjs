import { readFile } from "node:fs/promises";
import pg from "pg";

const targets = {
  staging: "ep-crimson-block-za1a50ot-pooler.c-2.eu-west-2.aws.neon.tech",
  production: "ep-holy-sound-zaigrb4x-pooler.c-2.eu-west-2.aws.neon.tech",
};
const environment = process.argv[2];
if (!(environment in targets)) throw new Error("Choose staging or production.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const connection = new URL(process.env.DATABASE_URL);
if (connection.hostname !== targets[environment]) throw new Error(`Refusing migration: database is not ${environment}.`);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const marker = await client.query("select exists(select 1 from information_schema.columns where table_schema='public' and table_name='content_pages' and column_name='seo_title') applied");
  if (marker.rows[0].applied) {
    console.log(`${environment} content SEO migration already applied.`);
  } else {
    const migration = (await readFile("supabase/migrations/0020_content_seo.sql", "utf8"))
      .replace(/(?<![a-zA-Z0-9_])auth\.uid\(\)/g, "app_auth.uid()")
      .replace(/(?<![a-zA-Z0-9_])auth\.jwt\(\)/g, "app_auth.jwt()");
    await client.query("begin");
    await client.query(migration);
    await client.query("commit");
    const verified = await client.query("select seo_title,indexable,author from public.content_pages limit 0");
    if (!verified) throw new Error("Content SEO migration verification failed.");
    console.log(`${environment} content SEO migration applied and verified.`);
  }
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

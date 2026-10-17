import { readFile } from "node:fs/promises";
import pg from "pg";

const expectedHost = "ep-holy-sound-zaigrb4x-pooler.c-2.eu-west-2.aws.neon.tech";
const url = process.env.DATABASE_URL;
if (!url || new URL(url).hostname !== expectedHost) {
  throw new Error("Refusing registration update: expected the production Neon database.");
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query("begin");
  const existing = await client.query(`select exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='registration_source'
  ) as installed`);
  if (!existing.rows[0].installed) {
    await client.query(await readFile("supabase/migrations/0026_registration_attribution.sql", "utf8"));
  }
  const verified = await client.query(`select
    to_regprocedure('app_private.complete_registration(uuid,text,text,text,text,text,text,text)') is not null as registration,
    (select count(*)::int from information_schema.columns
     where table_schema='public' and table_name='profiles'
       and column_name in ('registration_source','registration_source_detail','referrer_name','referrer_contact')) as columns`);
  if (!verified.rows[0].registration || verified.rows[0].columns !== 4) {
    throw new Error("Registration attribution migration verification failed.");
  }
  await client.query("commit");
  console.log("Production registration attribution schema and function verified.");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

import { readFile } from "node:fs/promises";
import pg from "pg";

const targets = {
  staging: {
    database: "ep-crimson-block-za1a50ot-pooler.c-2.eu-west-2.aws.neon.tech",
    auth: "ep-crimson-block-za1a50ot.neonauth.c-2.eu-west-2.aws.neon.tech",
  },
  production: {
    database: "ep-holy-sound-zaigrb4x-pooler.c-2.eu-west-2.aws.neon.tech",
    auth: "ep-holy-sound-zaigrb4x.neonauth.c-2.eu-west-2.aws.neon.tech",
  },
};

const environment = process.env.ACTIVATION_ENV || "staging";
const target = targets[environment];
if (!target) throw new Error("ACTIVATION_ENV must be staging or production");
if (!process.env.DATABASE_URL || !process.env.NEON_AUTH_BASE_URL)
  throw new Error("DATABASE_URL and NEON_AUTH_BASE_URL are required");
if (new URL(process.env.DATABASE_URL).hostname !== target.database)
  throw new Error(`Refusing migration: database is not ${environment}`);
if (new URL(process.env.NEON_AUTH_BASE_URL).hostname !== target.auth)
  throw new Error(`Refusing migration: Auth is not ${environment}`);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const before = await client.query(`
    select
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='whatsapp') whatsapp,
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='inspections' and column_name='reference') inspection_reference,
      to_regprocedure('app_private.complete_registration(uuid,text,text,text)') is not null registration_function
  `);
  const markers = before.rows[0];
  const duplicateAcceptances = await client.query(`
    select count(*)::int duplicates from (
      select user_id,version_id from public.agreement_acceptances
      where property_id is null group by user_id,version_id having count(*)>1
    ) duplicated
  `);
  if (duplicateAcceptances.rows[0].duplicates > 0)
    throw new Error("Refusing migration: duplicate account agreement acceptances exist");

  const migration = (
    await readFile("supabase/migrations/0012_registration_activation.sql", "utf8")
  ).replace(/(?<![a-zA-Z0-9_])auth\.uid\(\)/g, "app_auth.uid()");
  await client.query("begin");
  await client.query(migration);
  await client.query("commit");
  const applied = true;

  const after = await client.query(`
    select
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='whatsapp') whatsapp,
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='inspections' and column_name='reference') inspection_reference,
      to_regprocedure('app_private.complete_registration(uuid,text,text,text)') is not null registration_function
  `);
  if (!Object.values(after.rows[0]).every(Boolean))
    throw new Error("Activation migration marker verification failed");
  console.log(JSON.stringify({ environment, applied, markers: after.rows[0] }));
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

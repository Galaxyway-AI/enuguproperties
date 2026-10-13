import { readFile } from "node:fs/promises";
import pg from "pg";

const targets = {
  staging: "ep-crimson-block-za1a50ot-pooler.c-2.eu-west-2.aws.neon.tech",
  production: "ep-holy-sound-zaigrb4x-pooler.c-2.eu-west-2.aws.neon.tech",
};
const environment = process.argv[2];
if (!(environment in targets)) throw new Error("Choose staging or production.");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
if (new URL(process.env.DATABASE_URL).hostname !== targets[environment])
  throw new Error(`Refusing migration: database is not ${environment}.`);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const status = await client.query(`select
    to_regprocedure('public.propose_commission_agreement(uuid,integer,text,text,text)') is not null workflow,
    exists(select 1 from public.agreement_versions where kind='seller' and version='2026-10-13' and active and legal_approved) legal`);
  if (!status.rows[0].workflow || !status.rows[0].legal) {
    await client.query("begin");
    if (!status.rows[0].workflow) {
      const workflow = (await readFile("supabase/migrations/0023_flexible_commission.sql", "utf8"))
        .replace(/(?<![a-zA-Z0-9_])auth\.uid\(\)/g, "app_auth.uid()")
        .replace(/(?<![a-zA-Z0-9_])auth\.jwt\(\)/g, "app_auth.jwt()");
      await client.query(workflow);
    }
    if (!status.rows[0].legal)
      await client.query(await readFile("supabase/migrations/0024_commission_legal_versions.sql", "utf8"));
    await client.query("commit");
  }
  const verified = await client.query(`select
    to_regprocedure('public.propose_commission_agreement(uuid,integer,text,text,text)') is not null workflow,
    to_regprocedure('public.confirm_qualifying_sale(uuid,text)') is not null qualifying_sale,
    exists(select 1 from public.agreement_versions where kind='seller' and version='2026-10-13' and active and legal_approved) seller_terms,
    exists(select 1 from public.agreement_versions where kind='terms' and version='2026-10-13' and active and legal_approved) terms`);
  if (!Object.values(verified.rows[0]).every(Boolean))
    throw new Error("Commission migration verification failed.");
  console.log(`${environment} commission migrations applied and verified.`);
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

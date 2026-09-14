import { readFile } from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query("begin");
  await client.query(await readFile("neon/migrations/0001_platform.sql", "utf8"));
  await client.query(await readFile("supabase/seed.sql", "utf8"));
  await client.query("commit");
  console.log("Neon development schema and seed applied successfully.");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  await client.end();
}

import "server-only";
import { neon } from "@neondatabase/serverless";

export function serverDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export async function serverQuery<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error("The server database connection is not configured.");
  const sql = neon(connectionString);
  return (await sql.query(text, params)) as T[];
}

import { readFile } from "node:fs/promises";
import pg from "pg";

const generated = await readFile("lib/legal-documents.generated.ts", "utf8");
const prefix = "export const approvedLegalDocuments = ";
const start = generated.indexOf(prefix);
if (start < 0 || !generated.trimEnd().endsWith("as const;")) {
  throw new Error("Unexpected legal document module format.");
}
const approvedLegalDocuments = JSON.parse(
  generated.slice(start + prefix.length, generated.lastIndexOf(" as const;")),
);

const expectedHost = "ep-holy-sound-zaigrb4x-pooler.c-2.eu-west-2.aws.neon.tech";
const url = process.env.DATABASE_URL;
if (!url || new URL(url).hostname !== expectedHost) {
  throw new Error("Refusing address update: expected the production Neon database.");
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query("begin");
  const existing = await client.query(
    "select kind,version from public.agreement_versions where active and kind = any($1::text[])",
    [["terms", "privacy", "seller"]],
  );
  if (existing.rows.some((row) => row.version > "2026-10-17")) {
    throw new Error("A newer legal version is active; refusing to replace it.");
  }
  await client.query(
    await readFile("supabase/migrations/0025_registered_address_legal_versions.sql", "utf8"),
  );
  const active = await client.query(
    "select kind,version,content,sha256 from public.agreement_versions where active and kind = any($1::text[])",
    [["terms", "privacy", "seller"]],
  );
  for (const document of Object.values(approvedLegalDocuments)) {
    const row = active.rows.find((item) => item.kind === document.kind);
    if (!row || row.version !== document.version || row.sha256 !== document.sha256 ||
        row.content !== document.markdown || row.content.includes("House 10")) {
      throw new Error(`Address update verification failed for ${document.kind}.`);
    }
  }
  await client.query("commit");
  console.log("Production legal address updated and verified for terms, privacy and seller agreements.");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

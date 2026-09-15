import { mkdir, readFile, writeFile } from "node:fs/promises";

const sourceFiles = [
  "supabase/migrations/0001_foundation.sql",
  "supabase/migrations/0002_workflows.sql",
  "supabase/migrations/0003_storage.sql",
  "supabase/migrations/0004_operations.sql",
  "supabase/migrations/0005_release_controls.sql",
  "supabase/migrations/0006_property_details.sql",
  "supabase/migrations/0007_beta_operations.sql",
  // 0008-0010 are incremental repair migrations for databases whose schema
  // predated Neon Data API. A fresh Data API database already owns these
  // roles and schemas, so renaming them would be invalid.
  "supabase/migrations/0011_approved_legal_documents.sql",
  "supabase/migrations/0012_registration_activation.sql",
];

const compatibility = `-- Neon compatibility layer for the original PostgreSQL schema.
-- Neon Data API owns auth.*, anonymous, and authenticated. Application RLS
-- helpers live in app_auth so they never depend on privileges in managed schemas.
create schema if not exists app_auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  -- The Neon Data API provisioner owns the anonymous and authenticated roles.
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create or replace function app_auth.jwt() returns jsonb
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    jsonb_strip_nulls(jsonb_build_object(
      'sub', nullif(current_setting('request.jwt.claim.sub', true), ''),
      'aal', nullif(current_setting('request.jwt.claim.aal', true), '')
    ))
  );
$$;

create or replace function app_auth.uid() returns uuid
language sql stable
as $$
  select case
    when coalesce(app_auth.jwt()->>'sub', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (app_auth.jwt()->>'sub')::uuid
    else null
  end;
$$;

grant usage on schema app_auth to anon, anonymous, authenticated, service_role;
grant execute on function app_auth.jwt(), app_auth.uid() to anon, anonymous, authenticated, service_role;
`;

let sql = compatibility;
for (const file of sourceFiles) {
  sql += `\n\n-- Source: ${file}\n` + (await readFile(file, "utf8"));
}

sql = sql
  .replaceAll("references auth.users(id)", 'references neon_auth."user"(id)')
  .replaceAll("on auth.users", 'on neon_auth."user"')
  .replaceAll("new.raw_user_meta_data->>'full_name'", "new.name")
  .replace(/(?<![a-zA-Z0-9_])auth\.uid\(\)/g, "app_auth.uid()")
  .replace(/(?<![a-zA-Z0-9_])auth\.jwt\(\)/g, "app_auth.jwt()")
  .replaceAll(
    "grant select on public.locations,public.listing_plans,public.verification_types,public.content_pages to anon;",
    "grant select on public.locations,public.listing_plans,public.verification_types,public.content_pages to anon,anonymous;",
  )
  .replaceAll(
    "grant select on public.public_properties to anon,authenticated;",
    "grant select on public.public_properties to anon,anonymous,authenticated;",
  )
  .replaceAll(
    "grant usage on schema app_private to anon;",
    "grant usage on schema app_private to anon,anonymous;",
  )
  .replaceAll(
    "grant execute on function app_private.has_permission(text) to anon;",
    "grant execute on function app_private.has_permission(text) to anon,anonymous;",
  )
  .replace(
    /insert into storage\.buckets[^;]*;/g,
    "-- Object storage is provided by Cloudflare R2.",
  )
  .replace(
    /update storage\.buckets[^;]*;/g,
    "-- Object size limits are enforced by the upload service.",
  );

await mkdir("neon/migrations", { recursive: true });
await writeFile("neon/migrations/0001_platform.sql", sql);
console.log("Generated neon/migrations/0001_platform.sql");

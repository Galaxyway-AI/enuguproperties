import { mkdir, readFile, writeFile } from "node:fs/promises";

const sourceFiles = [
  "supabase/migrations/0001_foundation.sql",
  "supabase/migrations/0002_workflows.sql",
  "supabase/migrations/0003_storage.sql",
  "supabase/migrations/0004_operations.sql",
  "supabase/migrations/0005_release_controls.sql",
];

const compatibility = `-- Neon compatibility layer for the original PostgreSQL schema.
-- Neon Auth owns neon_auth.*. These helpers expose the authenticated JWT to the
-- existing RLS policies while keeping the application schema provider-neutral.
create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'anonymous') then create role anonymous nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create or replace function auth.jwt() returns jsonb
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

create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(auth.jwt()->>'sub', '')::uuid;
$$;

grant usage on schema auth to anon, anonymous, authenticated, service_role;
grant execute on function auth.jwt(), auth.uid() to anon, anonymous, authenticated, service_role;
`;

let sql = compatibility;
for (const file of sourceFiles) {
  sql += `\n\n-- Source: ${file}\n` + (await readFile(file, "utf8"));
}

sql = sql
  .replaceAll("references auth.users(id)", 'references neon_auth."user"(id)')
  .replaceAll("on auth.users", 'on neon_auth."user"')
  .replaceAll("new.raw_user_meta_data->>'full_name'", "new.name")
  .replaceAll("grant select on public.locations,public.listing_plans,public.verification_types,public.content_pages to anon;", "grant select on public.locations,public.listing_plans,public.verification_types,public.content_pages to anon,anonymous;")
  .replaceAll("grant select on public.public_properties to anon,authenticated;", "grant select on public.public_properties to anon,anonymous,authenticated;")
  .replaceAll("grant usage on schema app_private to anon;", "grant usage on schema app_private to anon,anonymous;")
  .replaceAll("grant execute on function app_private.has_permission(text) to anon;", "grant execute on function app_private.has_permission(text) to anon,anonymous;")
  .replace(/insert into storage\.buckets[^;]*;/g, "-- Object storage is provided by Cloudflare R2.")
  .replace(/update storage\.buckets[^;]*;/g, "-- Object size limits are enforced by the upload service.");

await mkdir("neon/migrations", { recursive: true });
await writeFile("neon/migrations/0001_platform.sql", sql);
console.log("Generated neon/migrations/0001_platform.sql");

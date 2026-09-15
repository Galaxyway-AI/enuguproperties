-- Keep application JWT helpers in a project-owned schema. Neon owns auth.* and
-- does not expose that schema to request roles.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'auth_legacy')
     and not exists (select 1 from pg_namespace where nspname = 'app_auth') then
    alter schema auth_legacy rename to app_auth;
  elsif not exists (select 1 from pg_namespace where nspname = 'app_auth') then
    create schema app_auth;
  end if;
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

grant usage on schema app_auth to anon, anonymous, authenticated,
  anonymous_legacy, authenticated_legacy, service_role;
grant execute on function app_auth.jwt(), app_auth.uid() to anon, anonymous,
  authenticated, anonymous_legacy, authenticated_legacy, service_role;

-- SQL-language and PL/pgSQL bodies created before the schema handoff retain
-- their source text, so recreate only project functions that call auth helpers.
do $$
declare
  function_record record;
  definition text;
begin
  for function_record in
    select procedure.oid
    from pg_proc procedure
    join pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('public', 'app_private')
      and procedure.prokind = 'f'
      and pg_get_functiondef(procedure.oid) not like '%app_auth.%'
      and (pg_get_functiondef(procedure.oid) like '%auth.' || 'uid()%'
        or pg_get_functiondef(procedure.oid) like '%auth.' || 'jwt()%')
  loop
    definition := pg_get_functiondef(function_record.oid);
    definition := replace(definition, 'auth.' || 'uid()', 'app_auth.' || 'uid()');
    definition := replace(definition, 'auth.' || 'jwt()', 'app_auth.' || 'jwt()');
    execute definition;
  end loop;
end $$;

do $$
begin
  if to_regclass('public.schema_migrations') is not null then
    execute 'alter table public.schema_migrations enable row level security';
    execute 'revoke all on public.schema_migrations from anonymous, authenticated';
  end if;
end $$;

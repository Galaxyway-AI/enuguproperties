-- Hand roles created by the original compatibility migration back to Neon.
-- PostgreSQL keeps grants and policy assignments attached to the renamed role OIDs.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anonymous')
     and not exists (select 1 from pg_roles where rolname = 'anonymous_legacy') then
    alter role anonymous rename to anonymous_legacy;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated')
     and not exists (select 1 from pg_roles where rolname = 'authenticated_legacy') then
    alter role authenticated rename to authenticated_legacy;
  end if;

  if exists (select 1 from pg_namespace where nspname = 'auth')
     and not exists (select 1 from pg_namespace where nspname = 'auth_legacy') then
    alter schema auth rename to auth_legacy;
  end if;
end $$;

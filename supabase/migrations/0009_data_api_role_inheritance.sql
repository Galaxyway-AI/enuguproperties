-- Preserve all existing grants and RLS policy membership after Neon creates its
-- request roles. Fresh databases have no legacy roles and need no handoff.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anonymous')
     and exists (select 1 from pg_roles where rolname = 'anonymous_legacy') then
    grant anonymous_legacy to anonymous;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated')
     and exists (select 1 from pg_roles where rolname = 'authenticated_legacy') then
    grant authenticated_legacy to authenticated;
  end if;
end $$;

-- 0006 recreates this view, so restate its intended public projection grant.
grant select on public.public_properties to anonymous, authenticated;

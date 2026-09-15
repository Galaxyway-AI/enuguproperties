-- Initial launch access is controlled by assigned staff roles. Two-factor
-- authentication can be introduced later without changing role assignments.
create or replace function app_private.has_permission(p text) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(
   select 1
   from public.user_roles ur
   join public.role_permissions rp on rp.role_id=ur.role_id
   join public.profiles u on u.id=ur.user_id
   where ur.user_id=auth.uid()
     and u.status='active'
     and rp.permission_id=p
 );
$$;

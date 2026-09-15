create table public.staff_mfa_factors(
 user_id uuid primary key references public.profiles(id) on delete cascade,
 secret_cipher text not null,
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.staff_mfa_sessions(
 user_id uuid primary key references public.profiles(id) on delete cascade,
 verified_at timestamptz not null default now(),
 expires_at timestamptz not null
);

alter table public.staff_mfa_factors enable row level security;
alter table public.staff_mfa_sessions enable row level security;
revoke all on public.staff_mfa_factors,public.staff_mfa_sessions from public,anon,authenticated;
grant all on public.staff_mfa_factors,public.staff_mfa_sessions to service_role;

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
     and (
       coalesce(auth.jwt()->>'aal','')='aal2'
       or exists(
         select 1 from public.staff_mfa_sessions s
         where s.user_id=auth.uid() and s.expires_at>now()
       )
     )
 );
$$;


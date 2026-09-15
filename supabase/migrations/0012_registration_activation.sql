-- Registration captures profile details and immutable legal-document versions.
alter table public.profiles
  add column if not exists whatsapp text not null default '';

create unique index if not exists one_account_acceptance_per_version
  on public.agreement_acceptances(user_id, version_id)
  where property_id is null;

create or replace function app_private.complete_registration(
  p_user uuid,
  p_name text,
  p_phone text,
  p_type text
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  terms_id uuid;
  privacy_id uuid;
begin
  if length(trim(p_name)) < 2 or length(p_name) > 120
     or length(trim(p_phone)) < 6 or length(p_phone) > 30
     or p_type not in ('owner','agent','developer','buyer') then
    raise exception 'Invalid registration details';
  end if;

  select id into terms_id
  from public.agreement_versions
  where kind='terms' and active and legal_approved;

  select id into privacy_id
  from public.agreement_versions
  where kind='privacy' and active and legal_approved;

  if terms_id is null or privacy_id is null then
    raise exception 'Approved registration documents are unavailable';
  end if;

  update public.profiles
  set full_name=trim(p_name), phone=trim(p_phone), seller_type=p_type
  where id=p_user;

  if not found then raise exception 'Registration profile was not created'; end if;

  insert into public.agreement_acceptances(user_id,version_id,method)
  values
    (p_user,terms_id,'registration_clickwrap'),
    (p_user,privacy_id,'registration_acknowledgement')
  on conflict do nothing;

  insert into public.audit_logs(actor_id,action,entity,entity_id,metadata)
  values (
    p_user,
    'account_registered',
    'profile',
    p_user,
    jsonb_build_object(
      'terms_version_id',terms_id,
      'privacy_version_id',privacy_id,
      'seller_type',p_type
    )
  );
end;
$$;

revoke all on function app_private.complete_registration(uuid,text,text,text)
  from public,anon,authenticated;
grant execute on function app_private.complete_registration(uuid,text,text,text)
  to service_role;

drop function if exists public.update_profile(text,text,text);
create or replace function public.update_profile(
  p_name text,
  p_phone text,
  p_whatsapp text,
  p_type text
) returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if not app_private.active_user()
     or length(p_name)<2 or length(p_name)>120
     or length(p_phone)<6 or length(p_phone)>30
     or length(p_whatsapp)>30
     or p_type not in ('owner','agent','developer','buyer') then
    raise exception 'Invalid profile';
  end if;
  update public.profiles
  set full_name=trim(p_name),phone=trim(p_phone),whatsapp=trim(p_whatsapp),seller_type=p_type
  where id=auth.uid();
end;
$$;

revoke all on function public.update_profile(text,text,text,text) from public;
grant execute on function public.update_profile(text,text,text,text) to authenticated;

-- Enquiries and inspections remain private, but the listing owner needs the
-- property-specific record to respond through the managed marketplace.
create sequence if not exists public.inspection_reference_seq;
alter table public.inspections
  add column if not exists reference text;
update public.inspections
set reference='EPI-'||to_char(created_at,'YYYY')||'-'||lpad(nextval('public.inspection_reference_seq')::text,6,'0')
where reference is null;
alter table public.inspections alter column reference set not null;
create unique index if not exists inspections_reference_unique
  on public.inspections(reference);
alter table public.inspections alter column reference
  set default ('EPI-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.inspection_reference_seq')::text,6,'0'));

drop policy if exists enquiries_read on public.enquiries;
create policy enquiries_read on public.enquiries for select using(
  buyer_id=auth.uid()
  or exists(
    select 1 from public.properties p
    where p.id=property_id and p.seller_id=auth.uid()
  )
  or app_private.has_permission('support')
  or app_private.has_permission('transactions')
);

drop policy if exists inspections_read on public.inspections;
create policy inspections_read on public.inspections for select using(
  buyer_id=auth.uid()
  or exists(
    select 1 from public.properties p
    where p.id=property_id and p.seller_id=auth.uid()
  )
  or (inspector_id=auth.uid() and app_private.has_permission('inspect'))
  or app_private.has_permission('verify')
  or app_private.has_permission('support')
);

create or replace function app_private.notify_marketplace_request()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  seller uuid;
  staff uuid;
  customer_reference text;
  notification_kind text;
begin
  select seller_id into seller from public.properties where id=new.property_id;
  customer_reference := case
    when tg_table_name='enquiries' then new.reference
    else new.reference
  end;
  notification_kind := case
    when tg_table_name='enquiries' then 'enquiry_received'
    else 'inspection_requested'
  end;

  perform app_private.notify(
    seller,
    notification_kind,
    case when tg_table_name='enquiries' then 'New property enquiry' else 'New inspection request' end,
    customer_reference||' was received for your property.'
  );

  for staff in
    select distinct ur.user_id
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id=ur.role_id
    join public.profiles profile on profile.id=ur.user_id
    where rp.permission_id='support' and profile.status='active'
      and ur.user_id<>seller
  loop
    perform app_private.notify(
      staff,
      notification_kind,
      case when tg_table_name='enquiries' then 'New property enquiry' else 'New inspection request' end,
      customer_reference||' is waiting in the staff queue.'
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists notify_enquiry_created on public.enquiries;
create trigger notify_enquiry_created
after insert on public.enquiries
for each row execute function app_private.notify_marketplace_request();

drop trigger if exists notify_inspection_created on public.inspections;
create trigger notify_inspection_created
after insert on public.inspections
for each row execute function app_private.notify_marketplace_request();

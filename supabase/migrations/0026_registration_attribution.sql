-- Capture a member's own account-discovery answer once at registration.
-- A named referral is evidence to review, not an automatic commission entitlement.
alter table public.profiles
  add column if not exists registration_source text not null default '',
  add column if not exists registration_source_detail text not null default '',
  add column if not exists referrer_name text not null default '',
  add column if not exists referrer_contact text not null default '';

alter table public.profiles
  add constraint profiles_registration_source_valid check (
    registration_source in ('','referral','search','social','whatsapp','online_ad','property_listing','offline','other')
  ),
  add constraint profiles_registration_detail_length check (length(registration_source_detail) <= 120),
  add constraint profiles_referrer_length check (
    length(referrer_name) <= 120 and length(referrer_contact) <= 254
  ),
  add constraint profiles_referral_identified check (
    registration_source <> 'referral' or
    (length(trim(referrer_name)) >= 2 and length(trim(referrer_contact)) >= 5)
  );

create or replace function app_private.complete_registration(
  p_user uuid,
  p_name text,
  p_phone text,
  p_type text,
  p_source text,
  p_source_detail text,
  p_referrer_name text,
  p_referrer_contact text
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
  if p_source not in ('referral','search','social','whatsapp','online_ad','property_listing','offline','other')
     or length(coalesce(p_source_detail,'')) > 120
     or length(coalesce(p_referrer_name,'')) > 120
     or length(coalesce(p_referrer_contact,'')) > 254 then
    raise exception 'Choose a valid answer for how you heard about us';
  end if;
  if p_source = 'social' and p_source_detail not in
     ('Facebook','Instagram','TikTok','X','LinkedIn','YouTube','Snapchat','Other social platform') then
    raise exception 'Choose the social media platform';
  end if;
  if p_source = 'other' and length(trim(coalesce(p_source_detail,''))) < 2 then
    raise exception 'Explain how you heard about us';
  end if;
  if p_source = 'referral' and
     (length(trim(coalesce(p_referrer_name,''))) < 2 or
      length(trim(coalesce(p_referrer_contact,''))) < 5) then
    raise exception 'Provide the referrer name and email or phone';
  end if;
  if p_source <> 'referral' and
     (coalesce(p_referrer_name,'') <> '' or coalesce(p_referrer_contact,'') <> '') then
    raise exception 'Referrer details require the referral option';
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
  set full_name=trim(p_name),
      phone=trim(p_phone),
      seller_type=p_type,
      registration_source=p_source,
      registration_source_detail=case when p_source='referral' then '' else trim(coalesce(p_source_detail,'')) end,
      referrer_name=case when p_source='referral' then trim(p_referrer_name) else '' end,
      referrer_contact=case when p_source='referral' then trim(p_referrer_contact) else '' end
  where id=p_user and registration_source='';
  if not found then raise exception 'Registration was already recorded or the profile was not created'; end if;

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
      'seller_type',p_type,
      'registration_source',p_source,
      'registration_source_detail',case when p_source='referral' then '' else trim(coalesce(p_source_detail,'')) end,
      'referrer_name',case when p_source='referral' then trim(p_referrer_name) else '' end
    )
  );
end;
$$;

revoke all on function app_private.complete_registration(uuid,text,text,text,text,text,text,text)
  from public,anon,authenticated;
grant execute on function app_private.complete_registration(uuid,text,text,text,text,text,text,text)
  to service_role;

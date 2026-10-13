-- Listing acceptance is separate from a negotiated sales commission.
-- Existing mandates, acceptances and completed commissions remain untouched.

create table public.commission_agreements (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id),
  seller_id uuid not null references public.profiles(id),
  basis_points int not null check (basis_points between 200 and 1000),
  service_scope text not null check (length(trim(service_scope)) between 20 and 2000),
  qualifying_conditions text not null check (length(trim(qualifying_conditions)) between 20 and 2000),
  payment_terms text not null check (length(trim(payment_terms)) between 8 and 500),
  status text not null default 'proposed' check (status in ('proposed','accepted','withdrawn')),
  proposed_by uuid not null references public.profiles(id),
  proposed_at timestamptz not null default now(),
  accepted_at timestamptz
);
create unique index one_accepted_commission_agreement_per_property
  on public.commission_agreements(property_id) where status='accepted';
create index commission_agreements_seller on public.commission_agreements(seller_id,proposed_at desc);
alter table public.commission_agreements enable row level security;
revoke all on public.commission_agreements from anon,anonymous,authenticated;
grant select on public.commission_agreements to authenticated;
create policy commission_agreements_read on public.commission_agreements for select
  using(seller_id=auth.uid() or app_private.has_permission('finance') or app_private.has_permission('transactions'));

create table public.legacy_commission_confirmations (
  mandate_id uuid primary key references public.marketing_mandates(id),
  signed_agreement_reference text not null check (length(trim(signed_agreement_reference)) between 8 and 200),
  confirmed_by uuid not null references public.profiles(id),
  confirmed_at timestamptz not null default now()
);
alter table public.legacy_commission_confirmations enable row level security;
revoke all on public.legacy_commission_confirmations from anon,anonymous,authenticated;
grant select on public.legacy_commission_confirmations to authenticated;
create policy legacy_commission_confirmations_read on public.legacy_commission_confirmations for select
  using(app_private.has_permission('finance') or app_private.has_permission('transactions'));

create table public.commission_qualifications (
  transaction_id uuid primary key references public.transaction_cases(id),
  agreement_id uuid not null references public.commission_agreements(id),
  qualifying_evidence text not null check(length(trim(qualifying_evidence)) between 12 and 1000),
  confirmed_by uuid not null references public.profiles(id),
  confirmed_at timestamptz not null default now()
);
alter table public.commission_qualifications enable row level security;
revoke all on public.commission_qualifications from anon,anonymous,authenticated;
grant select on public.commission_qualifications to authenticated;
create policy commission_qualifications_read on public.commission_qualifications for select
  using(app_private.has_permission('finance') or app_private.has_permission('transactions'));

alter table public.commissions add column commission_agreement_id uuid references public.commission_agreements(id);

create function app_private.protect_accepted_commission_agreement() returns trigger
language plpgsql set search_path='' as $$
begin
  if old.status='accepted' then
    raise exception 'Accepted commission agreements cannot be changed or deleted';
  end if;
  return coalesce(new,old);
end; $$;
create trigger protect_accepted_commission_agreement
before update or delete on public.commission_agreements
for each row execute function app_private.protect_accepted_commission_agreement();

create function public.propose_commission_agreement(
  p_property uuid,p_basis_points int,p_service_scope text,p_qualifying_conditions text,p_payment_terms text
) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.properties; agreement_id uuid;
begin
  if not app_private.has_permission('finance') or not app_private.has_permission('transactions') then
    raise exception 'Finance and transaction permissions are required';
  end if;
  if p_basis_points not between 200 and 1000 then raise exception 'Choose an agreed rate from 2%% to 10%%'; end if;
  if length(trim(coalesce(p_service_scope,''))) not between 20 and 2000
     or length(trim(coalesce(p_qualifying_conditions,''))) not between 20 and 2000
     or length(trim(coalesce(p_payment_terms,''))) not between 8 and 500 then
    raise exception 'Explain the services, qualifying sale and payment terms before proposing a rate';
  end if;
  select * into p from public.properties where id=p_property for update;
  if p.id is null or p.listing_purpose<>'sale' or p.status in ('sold','withdrawn','expired','rejected') then
    raise exception 'Choose an active property for sale';
  end if;
  if exists(select 1 from public.commission_agreements where property_id=p.id and status='accepted') then
    raise exception 'An accepted rate cannot be changed. Any variation requires a separate written agreement';
  end if;
  update public.commission_agreements set status='withdrawn'
    where property_id=p.id and status='proposed';
  insert into public.commission_agreements(
    property_id,seller_id,basis_points,service_scope,qualifying_conditions,payment_terms,proposed_by
  ) values(
    p.id,p.seller_id,p_basis_points,trim(p_service_scope),trim(p_qualifying_conditions),trim(p_payment_terms),auth.uid()
  ) returning id into agreement_id;
  perform app_private.audit('commission_proposed','property',p.id,jsonb_build_object('agreement_id',agreement_id,'basis_points',p_basis_points));
  perform app_private.notify(p.seller_id,'commission_proposed','Sales commission proposal',
    'Review the proposed rate and terms in your listing account before accepting. No commission applies merely because your advert was submitted.');
  return agreement_id;
end; $$;

create function public.accept_commission_agreement(p_agreement uuid) returns void
language plpgsql security definer set search_path='' as $$
declare agreement public.commission_agreements; p public.properties;
begin
  if not app_private.active_user() then raise exception 'An active seller account is required'; end if;
  select * into agreement from public.commission_agreements where id=p_agreement for update;
  if agreement.id is null or agreement.seller_id is distinct from auth.uid() or agreement.status<>'proposed' then
    raise exception 'This commission proposal is not available for acceptance';
  end if;
  select * into p from public.properties where id=agreement.property_id;
  if p.seller_id is distinct from auth.uid() or p.status in ('sold','withdrawn','expired','rejected') then
    raise exception 'This property is no longer eligible for a commission agreement';
  end if;
  update public.commission_agreements set status='accepted',accepted_at=now() where id=agreement.id;
  perform app_private.audit('commission_accepted','property',p.id,
    jsonb_build_object('agreement_id',agreement.id,'basis_points',agreement.basis_points));
end; $$;

create function public.confirm_legacy_commission(p_mandate uuid,p_reference text) returns void
language plpgsql security definer set search_path='' as $$
declare mandate public.marketing_mandates;
begin
  if not app_private.has_permission('finance') or not app_private.has_permission('transactions') then
    raise exception 'Finance and transaction permissions are required';
  end if;
  if length(trim(coalesce(p_reference,''))) not between 8 and 200 then
    raise exception 'Enter the signed historical agreement reference';
  end if;
  select * into mandate from public.marketing_mandates where id=p_mandate;
  if mandate.id is null or mandate.acceptance_id is null then
    raise exception 'An existing accepted mandate is required';
  end if;
  if exists(select 1 from public.commission_agreements where property_id=mandate.property_id and status='accepted') then
    raise exception 'A newer accepted agreement already exists for this property';
  end if;
  insert into public.legacy_commission_confirmations(mandate_id,signed_agreement_reference,confirmed_by)
    values(mandate.id,trim(p_reference),auth.uid());
  perform app_private.audit('legacy_commission_confirmed','property',mandate.property_id,
    jsonb_build_object('mandate_id',mandate.id,'reference',trim(p_reference)));
end; $$;

create function public.confirm_qualifying_sale(p_transaction uuid,p_evidence text) returns void
language plpgsql security definer set search_path='' as $$
declare t public.transaction_cases; agreement public.commission_agreements;
begin
  if not app_private.has_permission('finance') or not app_private.has_permission('transactions') then
    raise exception 'Finance and transaction permissions are required';
  end if;
  if length(trim(coalesce(p_evidence,''))) not between 12 and 1000 then
    raise exception 'Describe how this completed sale satisfies the accepted commission terms';
  end if;
  select * into t from public.transaction_cases where id=p_transaction for update;
  if t.id is null or t.stage<>'awaiting_completion' then
    raise exception 'The transaction must be awaiting completion';
  end if;
  select * into agreement from public.commission_agreements
    where property_id=t.property_id and status='accepted';
  if agreement.id is null or agreement.accepted_at>t.created_at then
    raise exception 'This transaction has no commission agreement accepted before its services began';
  end if;
  insert into public.commission_qualifications(transaction_id,agreement_id,qualifying_evidence,confirmed_by)
    values(t.id,agreement.id,trim(p_evidence),auth.uid());
  perform app_private.audit('commission_qualification_confirmed','transaction',t.id,
    jsonb_build_object('agreement_id',agreement.id,'evidence',trim(p_evidence)));
end; $$;

revoke all on function public.propose_commission_agreement(uuid,int,text,text,text),
  public.accept_commission_agreement(uuid),public.confirm_legacy_commission(uuid,text),
  public.confirm_qualifying_sale(uuid,text)
  from public,anon,anonymous,authenticated;
grant execute on function public.propose_commission_agreement(uuid,int,text,text,text),
  public.accept_commission_agreement(uuid),public.confirm_legacy_commission(uuid,text),
  public.confirm_qualifying_sale(uuid,text)
  to authenticated;

create or replace function public.submit_property(p_id uuid,p_agreement uuid) returns void
language plpgsql security definer set search_path='' as $$
declare p public.properties; plan public.listing_plans;
begin
  select * into p from public.properties where id=p_id for update;
  if not app_private.active_user() or p.seller_id is distinct from auth.uid() or p.status not in ('draft','needs_changes','payment_pending') then raise exception 'This listing cannot be submitted in its current status'; end if;
  select * into plan from public.listing_plans where id=p.plan_id and active;
  if plan.id is null then raise exception 'Select an available advertising plan'; end if;
  if length(trim(p.description))<50 then raise exception 'Describe the property using at least 50 characters'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and length(trim(full_name))>1 and length(trim(phone))>5) then raise exception 'Complete your name and phone number in your profile before submitting'; end if;
  if not exists(select 1 from public.property_media where property_id=p.id and kind='image' and status='ready') then raise exception 'Upload at least one property photograph before submitting'; end if;
  if not exists(select 1 from public.agreement_versions where id=p_agreement and kind='seller' and active and legal_approved) then raise exception 'Approved seller terms are not yet available'; end if;
  if plan.price_minor>0 and not exists(select 1 from public.orders where property_id=p.id and plan_id=p.plan_id and status='paid' and plan_snapshot=p.plan_snapshot) then raise exception 'Complete the advertising payment before submitting'; end if;
  insert into public.agreement_acceptances(user_id,property_id,version_id)
    values(auth.uid(),p.id,p_agreement) on conflict(user_id,property_id,version_id) do nothing;
  update public.properties set status='submitted',plan_snapshot=coalesce(plan_snapshot,to_jsonb(plan)),updated_at=now() where id=p.id;
  perform app_private.audit('listing_submitted','property',p.id);
  perform app_private.notify(auth.uid(),'listing_submitted','Listing submitted',
    p.reference||' is awaiting review. Further changes require another review.');
end; $$;

create or replace function public.manage_transaction(
  p_id uuid,p_property uuid,p_buyer uuid,p_stage text,p_summary text,p_sale bigint
) returns uuid language plpgsql security definer set search_path='' as $$
declare t public.transaction_cases; m public.marketing_mandates;
  agreement public.commission_agreements; result uuid; fee bigint;
  stages text[]:=array['buyer_qualified','offer_submitted','offer_accepted','verification_pending','due_diligence','professional_review','contract_stage','awaiting_completion','completed'];
begin
  if not app_private.has_permission('transactions') or length(p_summary)<10 then raise exception 'Transaction permission and summary required'; end if;
  if p_id is null then
    if not exists(select 1 from public.enquiries where property_id=p_property and buyer_id=p_buyer)
       and not exists(select 1 from public.offers where property_id=p_property and buyer_id=p_buyer)
      then raise exception 'A recorded introduction is required'; end if;
    insert into public.transaction_cases(property_id,buyer_id,assigned_to)
      values(p_property,p_buyer,auth.uid()) returning id into result;
    p_stage:='buyer_qualified';
  else
    select * into t from public.transaction_cases where id=p_id for update; result:=t.id;
    if t.id is null or t.stage in ('completed','withdrawn','failed') then raise exception 'Transaction cannot be changed'; end if;
    if p_stage not in ('withdrawn','failed','disputed')
       and (array_position(stages,p_stage) is null or array_position(stages,p_stage)<>coalesce(array_position(stages,t.stage),0)+1)
      then raise exception 'Complete transaction stages in order'; end if;
    if p_stage='completed' then
      if p_sale is null or p_sale<=0 then raise exception 'Completed sale amount required'; end if;
      select proposal.* into agreement from public.commission_agreements proposal
        join public.commission_qualifications qualification on qualification.agreement_id=proposal.id
        where proposal.property_id=t.property_id and proposal.status='accepted'
          and qualification.transaction_id=t.id and proposal.accepted_at<=t.created_at;
      if agreement.id is not null then
        fee:=round(p_sale::numeric*agreement.basis_points/10000)::bigint;
        insert into public.commissions(transaction_id,commission_agreement_id,sale_price_minor,amount_minor,basis_snapshot,status)
          values(t.id,agreement.id,p_sale,fee,to_jsonb(agreement),'due');
      elsif not exists(select 1 from public.commission_agreements
        where property_id=t.property_id and status='accepted') then
        select mandate.* into m from public.marketing_mandates mandate
          join public.legacy_commission_confirmations confirmation on confirmation.mandate_id=mandate.id
          where mandate.property_id=t.property_id and mandate.acceptance_id is not null;
        if m.id is not null then
          fee:=case when m.kind='waived' then 0 when m.kind='fixed' then m.fixed_minor
            else greatest(m.minimum_minor,round(p_sale::numeric*m.basis_points/10000)::bigint) end;
          insert into public.commissions(transaction_id,mandate_id,sale_price_minor,amount_minor,basis_snapshot,status)
            values(t.id,m.id,p_sale,fee,to_jsonb(m),case when m.kind='waived' then 'waived' else 'due' end);
        end if;
      end if;
      update public.properties set status='sold',updated_at=now() where id=t.property_id;
    end if;
    update public.transaction_cases set stage=p_stage,
      sale_price_minor=case when p_stage='completed' then p_sale else sale_price_minor end where id=t.id;
  end if;
  insert into public.transaction_events(transaction_id,stage,summary,actor_id)
    values(result,p_stage,p_summary,auth.uid());
  perform app_private.audit('transaction_'||p_stage,'transaction',result);
  return result;
end; $$;

-- The old 2% setting is retained for historical inspection but can no longer
-- establish a rate for newly submitted adverts.
create or replace function public.admin_config(p_kind text,p_id text,p_data jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not app_private.has_permission('settings') then raise exception 'Settings permission required'; end if;
  if p_kind='plan' then
    update public.listing_plans set price_minor=(p_data->>'price_minor')::bigint,
      duration_days=(p_data->>'duration_days')::int,photo_limit=(p_data->>'photo_limit')::int,
      video_limit=(p_data->>'video_limit')::int,featured_days=(p_data->>'featured_days')::int,
      active=coalesce((p_data->>'active')::boolean,true) where id=p_id;
  elsif p_kind='location' then
    insert into public.locations(name,slug,kind,parent_id,description)
      values(p_data->>'name',p_data->>'slug',p_data->>'kind',nullif(p_data->>'parent_id','')::uuid,coalesce(p_data->>'description',''));
  else raise exception 'This configuration is no longer available'; end if;
  perform app_private.audit('settings_updated',p_kind,null,jsonb_build_object('id',p_id));
end; $$;

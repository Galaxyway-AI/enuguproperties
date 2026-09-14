-- Neon compatibility layer for the original PostgreSQL schema.
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


-- Source: supabase/migrations/0001_foundation.sql
-- All timestamps are UTC. Monetary values are integer NGN minor units.
create extension if not exists pgcrypto;
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;

create table public.profiles (
 id uuid primary key references neon_auth."user"(id), full_name text not null default '', phone text not null default '',
 seller_type text not null default 'owner' check(seller_type in ('owner','agent','developer','buyer')),
 status text not null default 'active' check(status in ('pending','active','restricted','suspended','banned','closed')),
 created_at timestamptz not null default now()
);
create table public.roles (id text primary key);
create table public.permissions (id text primary key);
create table public.role_permissions(role_id text references public.roles, permission_id text references public.permissions, primary key(role_id,permission_id));
create table public.user_roles(user_id uuid references public.profiles, role_id text references public.roles, primary key(user_id,role_id));
create function app_private.has_permission(p text) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id join public.profiles u on u.id=ur.user_id
 where ur.user_id=auth.uid() and u.status='active' and rp.permission_id=p and coalesce(auth.jwt()->>'aal','')='aal2');
$$;
create function app_private.active_user() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and status='active');
$$;
create function public.my_permissions() returns setof text language sql stable security definer set search_path = '' as $$
 select p.id from public.permissions p where app_private.has_permission(p.id);
$$;
create function app_private.on_signup() returns trigger language plpgsql security definer set search_path='' as $$
begin insert into public.profiles(id,full_name) values(new.id,left(coalesce(new.name,''),120)); return new; end; $$;
create trigger on_signup after insert on neon_auth."user" for each row execute function app_private.on_signup();

create table public.organisations(id uuid primary key default gen_random_uuid(), name text not null, kind text not null, created_by uuid references public.profiles, created_at timestamptz not null default now());
create table public.organisation_members(organisation_id uuid references public.organisations, user_id uuid references public.profiles, member_role text not null, primary key(organisation_id,user_id));
create table public.locations(id uuid primary key default gen_random_uuid(), parent_id uuid references public.locations, kind text not null check(kind in ('state','lga','city','area','estate')), name text not null, slug text unique not null, description text not null default '', active boolean not null default true);
create table public.listing_plans(id text primary key, name text not null, price_minor bigint not null check(price_minor>=0), duration_days int not null check(duration_days between 1 and 365), photo_limit int not null check(photo_limit between 1 and 100), video_limit int not null default 0 check(video_limit between 0 and 10), video_seconds int not null default 120, video_max_bytes bigint not null default 104857600, featured_days int not null default 0, visibility_weight int not null default 0, analytics boolean not null default false, active boolean not null default true);
create table public.system_settings(key text primary key, value jsonb not null);
create sequence public.property_reference_seq;
create table public.properties(
 id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.profiles,
 reference text unique not null default ('EP-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.property_reference_seq')::text,6,'0')),
 slug text unique not null default gen_random_uuid()::text, title text not null check(length(title) between 5 and 160),
 category text not null check(category in ('houses','land','commercial','new-developments')),
 location_id uuid not null references public.locations, description text not null default '' check(length(description)<=15000),
 price_minor bigint not null check(price_minor between 100 and 9007199254740991), bedrooms int check(bedrooms between 0 and 100), bathrooms int check(bathrooms between 0 and 100),
 land_sqm numeric not null check(land_sqm>0), features text[] not null default '{}', title_type text not null default '',
 status text not null default 'draft' check(status in ('draft','submitted','payment_pending','under_review','needs_changes','live','paused','under_offer','sold','expired','rejected','withdrawn','archived')),
 plan_id text not null references public.listing_plans default 'free', plan_snapshot jsonb, expires_at timestamptz,
 revision int not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), published_at timestamptz,
 is_demo boolean not null default false
);
create table public.property_private(property_id uuid primary key references public.properties, address text not null default '', latitude numeric check(latitude between -90 and 90), longitude numeric check(longitude between -180 and 180), ownership text not null default '', survey_reference text not null default '');
create table public.property_revisions(id bigint generated always as identity primary key, property_id uuid references public.properties, actor_id uuid references public.profiles, revision int not null, snapshot jsonb not null, created_at timestamptz not null default now());
create table public.price_history(id bigint generated always as identity primary key, property_id uuid references public.properties, previous_minor bigint not null, new_minor bigint not null, created_at timestamptz not null default now());
create table public.property_media(id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties, storage_path text unique not null, kind text not null check(kind in ('image','video')), mime text not null, size_bytes bigint not null, status text not null default 'ready' check(status in ('processing','ready','rejected')), alt text not null default '', created_at timestamptz not null default now());
create table public.document_types(id text primary key, name text not null, classification text not null check(classification in ('property','kyc')));
create table public.property_documents(id uuid primary key default gen_random_uuid(), property_id uuid references public.properties, owner_id uuid not null references public.profiles, type_id text not null references public.document_types, storage_path text unique not null, original_name text not null, mime text not null, sha256 text not null, created_at timestamptz not null default now());
create table public.verification_types(id text primary key, name text not null, meaning text not null, limitation text not null);
create table public.professional_providers(id uuid primary key default gen_random_uuid(), name text not null, profession text not null, organisation text, credentials_reference text, credentials_confirmed boolean not null default false, active boolean not null default true);
create table public.property_verifications(id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties, type_id text not null references public.verification_types,
 status text not null default 'requested' check(status in ('requested','in_progress','more_information_required','completed','failed','expired','cancelled')),
 requested_at timestamptz not null default now(), started_at timestamptz, completed_at timestamptz, expires_at timestamptz, officer_id uuid references public.profiles, provider_id uuid references public.professional_providers,
 public_summary text not null default '', internal_notes text not null default '', evidence_document_id uuid references public.property_documents, property_revision int not null, outcome text, unique(property_id,type_id,property_revision));
create table public.moderation_reviews(id uuid primary key default gen_random_uuid(), property_id uuid references public.properties, actor_id uuid references public.profiles, decision text not null, reason text not null, created_at timestamptz not null default now());
create table public.promotions(id uuid primary key default gen_random_uuid(), property_id uuid references public.properties, starts_at timestamptz not null, ends_at timestamptz not null check(ends_at>starts_at), source text not null check(source in ('paid','editorial')), created_by uuid references public.profiles);
create table public.risk_flags(id uuid primary key default gen_random_uuid(), property_id uuid references public.properties, reason text not null, status text not null default 'open', created_at timestamptz not null default now());

create sequence public.enquiry_reference_seq;
create table public.enquiries(id uuid primary key default gen_random_uuid(), reference text unique not null default ('EPQ-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.enquiry_reference_seq')::text,6,'0')), buyer_id uuid not null references public.profiles, property_id uuid not null references public.properties, message text not null check(length(message) between 10 and 5000), preferred_contact text not null default 'email', status text not null default 'new', assigned_to uuid references public.profiles, created_at timestamptz not null default now());
create table public.saved_properties(user_id uuid references public.profiles, property_id uuid references public.properties, created_at timestamptz not null default now(), primary key(user_id,property_id));
create table public.inspections(id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties, buyer_id uuid references public.profiles, inspector_id uuid references public.profiles, preferred_at timestamptz not null, attendees int not null default 1 check(attendees between 1 and 20), overseas boolean not null default false, notes text not null default '', status text not null default 'requested' check(status in ('requested','confirmed','cancelled','completed')), completed_at timestamptz, created_at timestamptz not null default now());
create table public.inspection_evidence(inspection_id uuid primary key references public.inspections, observed_at timestamptz not null, observations text not null, document_id uuid not null references public.property_documents, latitude numeric, longitude numeric);
create table public.offers(id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties, buyer_id uuid not null references public.profiles, amount_minor bigint not null check(amount_minor>0), conditions text not null, status text not null default 'submitted' check(status in ('submitted','accepted','rejected','countered','withdrawn')), created_at timestamptz not null default now());
create table public.offer_events(id bigint generated always as identity primary key, offer_id uuid references public.offers, actor_id uuid references public.profiles, status text not null, amount_minor bigint, message text not null, created_at timestamptz not null default now());
create sequence public.transaction_reference_seq;
create table public.transaction_cases(id uuid primary key default gen_random_uuid(), reference text unique not null default ('EPT-'||to_char(now(),'YYYY')||'-'||lpad(nextval('public.transaction_reference_seq')::text,6,'0')), property_id uuid not null references public.properties, buyer_id uuid not null references public.profiles, assigned_to uuid references public.profiles, stage text not null default 'buyer_qualified' check(stage in ('buyer_qualified','offer_submitted','offer_accepted','verification_pending','due_diligence','professional_review','contract_stage','awaiting_completion','completed','withdrawn','failed','disputed')), sale_price_minor bigint, created_at timestamptz not null default now());
create table public.transaction_events(id bigint generated always as identity primary key, transaction_id uuid references public.transaction_cases, stage text not null, summary text not null, actor_id uuid references public.profiles, created_at timestamptz not null default now());
create table public.agreement_versions(id uuid primary key default gen_random_uuid(), kind text not null, version text not null, content text not null, sha256 text not null, legal_approved boolean not null default false, active boolean not null default false, unique(kind,version));
create table public.agreement_acceptances(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles, property_id uuid references public.properties, version_id uuid not null references public.agreement_versions, accepted_at timestamptz not null default now(), method text not null default 'clickwrap', unique(user_id,property_id,version_id));
create table public.marketing_mandates(id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.profiles, property_id uuid unique references public.properties, kind text not null check(kind in ('percentage','fixed','waived')), basis_points int check(basis_points between 0 and 10000), fixed_minor bigint check(fixed_minor>=0), minimum_minor bigint not null default 0, acceptance_id uuid references public.agreement_acceptances, created_at timestamptz not null default now());
create table public.commissions(id uuid primary key default gen_random_uuid(), transaction_id uuid unique references public.transaction_cases, mandate_id uuid references public.marketing_mandates, sale_price_minor bigint not null, amount_minor bigint not null, basis_snapshot jsonb not null, status text not null default 'due' check(status in ('not_applicable','estimated','due','invoiced','partially_paid','paid','waived','disputed','written_off')), invoice_reference text, paid_at timestamptz);
create table public.orders(id uuid primary key default gen_random_uuid(), reference text unique not null default ('EPP-'||replace(gen_random_uuid()::text,'-','')), user_id uuid not null references public.profiles, property_id uuid not null references public.properties, plan_id text not null references public.listing_plans, plan_snapshot jsonb not null, amount_minor bigint not null check(amount_minor>0), currency text not null default 'NGN' check(currency='NGN'), purpose text not null default 'listing' check(purpose='listing'), status text not null default 'pending' check(status in ('pending','paid','failed','refunded')), provider_id text unique, created_at timestamptz not null default now(), paid_at timestamptz);
create unique index one_pending_order on public.orders(property_id) where status='pending';
create table public.property_reports(id uuid primary key default gen_random_uuid(), property_id uuid references public.properties, reporter_id uuid references public.profiles, reason text not null, message text not null, status text not null default 'open', created_at timestamptz not null default now());
create table public.support_tickets(id uuid primary key default gen_random_uuid(), reference text unique not null default ('EPS-'||upper(substr(gen_random_uuid()::text,1,8))), user_id uuid references public.profiles, email text not null, category text not null, message text not null, status text not null default 'open', assigned_to uuid references public.profiles, created_at timestamptz not null default now());
create table public.notifications(id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles, kind text not null, title text not null, body text not null, read_at timestamptz, created_at timestamptz not null default now());
create table public.email_outbox(id uuid primary key default gen_random_uuid(), notification_id uuid unique references public.notifications, status text not null default 'pending', attempts int not null default 0, next_attempt_at timestamptz not null default now(), sent_at timestamptz);
create table public.audit_logs(id bigint generated always as identity primary key, actor_id uuid, action text not null, entity text not null, entity_id uuid, metadata jsonb not null default '{}', created_at timestamptz not null default now());
create table public.content_pages(slug text primary key, title text not null, description text not null, content text not null, published boolean not null default false, updated_at timestamptz not null default now());
create table public.rate_limits(key text primary key, hits int not null default 1, window_start timestamptz not null default now());

create function app_private.audit(action text, entity text, entity_id uuid, metadata jsonb default '{}') returns void language sql security definer set search_path='' as $$
 insert into public.audit_logs(actor_id,action,entity,entity_id,metadata) values(auth.uid(),action,entity,entity_id,metadata);
$$;
create function app_private.notify(user_id uuid, kind text, title text, body text) returns void language plpgsql security definer set search_path='' as $$
declare n uuid; begin
 insert into public.notifications(user_id,kind,title,body) values(user_id,kind,title,body) returning id into n;
 insert into public.email_outbox(notification_id) values(n);
end; $$;

-- No raw table writes from browser roles. Mutations use narrowly scoped RPCs.
do $$ declare t record; begin
 for t in select tablename from pg_tables where schemaname='public' loop
 execute format('alter table public.%I enable row level security',t.tablename);
 execute format('revoke all on public.%I from anon, authenticated',t.tablename);
 execute format('grant select on public.%I to authenticated',t.tablename);
 end loop;
end $$;
grant select on public.locations,public.listing_plans,public.verification_types,public.content_pages to anon,anonymous;
create policy locations_read on public.locations for select using(active);
create policy plans_read on public.listing_plans for select using(active or app_private.has_permission('settings'));
create policy verification_types_read on public.verification_types for select using(true);
create policy pages_read on public.content_pages for select using(published or app_private.has_permission('content'));
create policy profiles_read on public.profiles for select using(id=auth.uid() or app_private.has_permission('moderate') or app_private.has_permission('compliance'));
create policy properties_read on public.properties for select using(seller_id=auth.uid() or app_private.has_permission('moderate') or app_private.has_permission('verify') or app_private.has_permission('transactions'));
create policy private_read on public.property_private for select using(exists(select 1 from public.properties p where p.id=property_id and p.seller_id=auth.uid()) or app_private.has_permission('moderate') or app_private.has_permission('verify'));
create policy revisions_read on public.property_revisions for select using(app_private.has_permission('moderate'));
create policy price_read on public.price_history for select using(app_private.has_permission('moderate'));
create policy media_read on public.property_media for select using(exists(select 1 from public.properties p where p.id=property_id));
create policy documents_read on public.property_documents for select using(owner_id=auth.uid() or (app_private.has_permission('compliance')) or (app_private.has_permission('verify') and exists(select 1 from public.document_types d where d.id=type_id and d.classification='property')));
create policy document_types_read on public.document_types for select using(true);
create policy verifications_read on public.property_verifications for select using(app_private.has_permission('verify'));
create policy reviews_read on public.moderation_reviews for select using(app_private.has_permission('moderate') or exists(select 1 from public.properties p where p.id=property_id and p.seller_id=auth.uid()));
create policy risk_read on public.risk_flags for select using(app_private.has_permission('moderate'));
create policy enquiries_read on public.enquiries for select using(buyer_id=auth.uid() or app_private.has_permission('support') or app_private.has_permission('transactions'));
create policy saves_read on public.saved_properties for select using(user_id=auth.uid());
create policy inspections_read on public.inspections for select using(buyer_id=auth.uid() or (inspector_id=auth.uid() and app_private.has_permission('inspect')) or app_private.has_permission('verify') or app_private.has_permission('support'));
create policy evidence_read on public.inspection_evidence for select using(app_private.has_permission('verify') or exists(select 1 from public.inspections i where i.id=inspection_id and i.inspector_id=auth.uid() and app_private.has_permission('inspect')));
create policy offers_read on public.offers for select using(buyer_id=auth.uid() or app_private.has_permission('transactions') or exists(select 1 from public.properties p where p.id=property_id and p.seller_id=auth.uid()));
create policy offer_events_read on public.offer_events for select using(exists(select 1 from public.offers o where o.id=offer_id));
create policy transactions_read on public.transaction_cases for select using(buyer_id=auth.uid() or app_private.has_permission('transactions') or exists(select 1 from public.properties p where p.id=property_id and p.seller_id=auth.uid()));
create policy timeline_read on public.transaction_events for select using(exists(select 1 from public.transaction_cases t where t.id=transaction_id));
create policy agreements_read on public.agreement_versions for select using(active or app_private.has_permission('settings') or exists(select 1 from public.agreement_acceptances a where a.version_id=id and a.user_id=auth.uid()));
create policy acceptances_read on public.agreement_acceptances for select using(user_id=auth.uid() or app_private.has_permission('compliance'));
create policy mandates_read on public.marketing_mandates for select using(seller_id=auth.uid() or app_private.has_permission('transactions') or app_private.has_permission('finance'));
create policy commissions_read on public.commissions for select using(app_private.has_permission('finance'));
create policy orders_read on public.orders for select using(user_id=auth.uid() or app_private.has_permission('finance'));
create policy reports_read on public.property_reports for select using(reporter_id=auth.uid() or app_private.has_permission('moderate'));
create policy tickets_read on public.support_tickets for select using(user_id=auth.uid() or app_private.has_permission('support'));
create policy notifications_read on public.notifications for select using(user_id=auth.uid());
create policy audits_read on public.audit_logs for select using(app_private.has_permission('audit'));
create policy settings_read on public.system_settings for select using(app_private.has_permission('settings'));
create policy providers_read on public.professional_providers for select using(app_private.has_permission('verify'));
create policy promotions_read on public.promotions for select using(app_private.has_permission('moderate'));
create policy organisations_read on public.organisations for select using(created_by=auth.uid() or app_private.has_permission('moderate'));
create policy members_read on public.organisation_members for select using(user_id=auth.uid());

-- Deliberately owner-executed view: the only anonymous property projection.
-- Every selected column is public; exact location, seller ID, documents and internal evidence are excluded.
create view public.public_properties as
select p.id,p.reference,p.slug,p.title,p.description,p.category,l.name area,l.slug area_slug,p.price_minor,p.bedrooms,p.bathrooms,p.land_sqm,p.features,
 u.seller_type,p.status,p.created_at,p.updated_at,
 exists(select 1 from public.promotions x where x.property_id=p.id and x.starts_at<=now() and x.ends_at>now()) featured,
 exists(select 1 from public.price_history h where h.property_id=p.id and h.new_minor<h.previous_minor and h.created_at>now()-interval '30 days') price_reduced,
 coalesce((select jsonb_agg('/api/media/'||m.id order by m.created_at) from public.property_media m where m.property_id=p.id and m.kind='image' and m.status='ready'),'[]') images,
 coalesce((select jsonb_agg(jsonb_build_object('type',v.type_id,'summary',v.public_summary,'completed_at',v.completed_at,'expires_at',v.expires_at)) from public.property_verifications v where v.property_id=p.id and v.status='completed' and v.property_revision=p.revision and (v.expires_at is null or v.expires_at>now())),'[]') checks
from public.properties p join public.locations l on l.id=p.location_id join public.profiles u on u.id=p.seller_id
where p.status in ('live','under_offer','sold','expired') and p.published_at is not null and u.status='active' and not p.is_demo;
grant select on public.public_properties to anon,anonymous,authenticated;
create index properties_search on public.properties using gin(to_tsvector('english',title||' '||description));
create index properties_filters on public.properties(status,location_id,category,price_minor);
create index verifications_property on public.property_verifications(property_id,status);
create index media_property on public.property_media(property_id);
create index documents_owner on public.property_documents(owner_id,property_id);
create index enquiries_buyer on public.enquiries(buyer_id,created_at desc);
create index inspections_assignee on public.inspections(inspector_id,status);
create index audit_entity on public.audit_logs(entity_id,created_at desc);

revoke execute on all functions in schema app_private from public;
grant execute on function app_private.has_permission(text),app_private.active_user() to authenticated;
revoke execute on function public.my_permissions() from public;
grant execute on function public.my_permissions() to authenticated;


-- Source: supabase/migrations/0002_workflows.sql
create function public.update_profile(p_name text,p_phone text,p_type text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not app_private.active_user() or length(p_name)<2 or length(p_name)>120 or length(p_phone)>30 then raise exception 'Invalid profile'; end if;
 update public.profiles set full_name=p_name,phone=p_phone,seller_type=p_type where id=auth.uid();
end; $$;

create function public.save_property(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.properties; result uuid; loc uuid; begin
 if not app_private.active_user() then raise exception 'Active account required'; end if;
 loc:=(p_data->>'location_id')::uuid;
 if not exists(select 1 from public.locations where id=loc and active and kind in ('area','estate','city')) then raise exception 'Choose an available area'; end if;
 if p_id is null then
 insert into public.properties(seller_id,title,category,location_id,description,price_minor,bedrooms,bathrooms,land_sqm,title_type,features)
 values(auth.uid(),p_data->>'title',p_data->>'category',loc,coalesce(p_data->>'description',''),(p_data->>'price_minor')::bigint,nullif(p_data->>'bedrooms','')::int,nullif(p_data->>'bathrooms','')::int,(p_data->>'land_sqm')::numeric,coalesce(p_data->>'title_type',''),array(select jsonb_array_elements_text(coalesce(p_data->'features','[]')))) returning id into result;
 update public.properties set slug=trim(both '-' from regexp_replace(lower(title),'[^a-z0-9]+','-','g'))||'-'||lower(reference) where id=result;
 insert into public.property_private(property_id,address,ownership,latitude,longitude,survey_reference) values(result,coalesce(p_data->>'address',''),coalesce(p_data->>'ownership',''),nullif(p_data->>'latitude','')::numeric,nullif(p_data->>'longitude','')::numeric,coalesce(p_data->>'survey_reference',''));
 else
 select * into p from public.properties where id=p_id for update;
 if p.seller_id is distinct from auth.uid() or p.status not in ('draft','needs_changes','live','paused','under_offer','rejected','expired') then raise exception 'Listing cannot be edited'; end if;
 insert into public.property_revisions(property_id,actor_id,revision,snapshot) values(p.id,auth.uid(),p.revision,to_jsonb(p));
 if p.price_minor<>(p_data->>'price_minor')::bigint then insert into public.price_history(property_id,previous_minor,new_minor) values(p.id,p.price_minor,(p_data->>'price_minor')::bigint); end if;
 update public.properties set title=p_data->>'title',category=p_data->>'category',location_id=loc,description=coalesce(p_data->>'description',''),price_minor=(p_data->>'price_minor')::bigint,bedrooms=nullif(p_data->>'bedrooms','')::int,bathrooms=nullif(p_data->>'bathrooms','')::int,land_sqm=(p_data->>'land_sqm')::numeric,title_type=coalesce(p_data->>'title_type',''),features=array(select jsonb_array_elements_text(coalesce(p_data->'features','[]'))),
 status=case when p.status in ('live','under_offer','paused') then 'under_review' else 'draft' end,revision=revision+1,updated_at=now() where id=p.id;
 update public.property_private set address=coalesce(p_data->>'address',''),ownership=coalesce(p_data->>'ownership',''),latitude=nullif(p_data->>'latitude','')::numeric,longitude=nullif(p_data->>'longitude','')::numeric,survey_reference=coalesce(p_data->>'survey_reference','') where property_id=p.id;
 update public.property_verifications set status='expired' where property_id=p.id and status='completed';
 perform app_private.audit('material_revision','property',p.id,jsonb_build_object('previous_revision',p.revision)); result:=p.id;
 end if;
 if exists(select 1 from public.property_private a join public.property_private b on lower(a.address)=lower(b.address) and a.property_id<>b.property_id where a.property_id=result and length(a.address)>8) then
 insert into public.risk_flags(property_id,reason) values(result,'Potential address match — manual review required'); end if;
 return result;
end; $$;

create function public.select_plan(p_id uuid,p_plan text) returns void language plpgsql security definer set search_path='' as $$
declare p public.properties; plan public.listing_plans; begin
 select * into p from public.properties where id=p_id for update;
 if not app_private.active_user() or p.seller_id is distinct from auth.uid() or p.status not in ('draft','needs_changes','payment_pending') then raise exception 'Plan cannot be changed'; end if;
 select * into plan from public.listing_plans where id=p_plan and active;
 if plan.id is null then raise exception 'Plan unavailable'; end if;
 if (select count(*) from public.property_media where property_id=p.id and kind='image')>plan.photo_limit or (select count(*) from public.property_media where property_id=p.id and kind='video')>plan.video_limit then raise exception 'Remove media exceeding this plan allowance'; end if;
 update public.orders set status='failed' where property_id=p.id and status='pending';
 update public.properties set plan_id=plan.id,plan_snapshot=to_jsonb(plan),status='draft' where id=p.id;
end; $$;

create function public.submit_property(p_id uuid,p_agreement uuid) returns void language plpgsql security definer set search_path='' as $$
declare p public.properties; plan public.listing_plans; a uuid; begin
 select * into p from public.properties where id=p_id for update;
 if not app_private.active_user() or p.seller_id is distinct from auth.uid() or p.status not in ('draft','needs_changes','payment_pending') then raise exception 'Listing cannot be submitted'; end if;
 select * into plan from public.listing_plans where id=p.plan_id and active;
 if plan.id is null then raise exception 'Select an available plan'; end if;
 if length(p.description)<50 or not exists(select 1 from public.profiles where id=auth.uid() and length(full_name)>1 and length(phone)>5) then raise exception 'Complete your profile and property description'; end if;
 if not exists(select 1 from public.property_media where property_id=p.id and kind='image' and status='ready') then raise exception 'Add at least one property photograph'; end if;
 if not exists(select 1 from public.property_documents d join public.document_types dt on dt.id=d.type_id where d.property_id=p.id and dt.classification='property') then raise exception 'Upload available ownership or marketing evidence'; end if;
 if not exists(select 1 from public.agreement_versions where id=p_agreement and kind='seller' and active and legal_approved) then raise exception 'Approved seller terms are not yet available'; end if;
 if plan.price_minor>0 and not exists(select 1 from public.orders where property_id=p.id and plan_id=p.plan_id and status='paid' and plan_snapshot=p.plan_snapshot) then raise exception 'Complete the advertising payment before submitting'; end if;
 insert into public.agreement_acceptances(user_id,property_id,version_id) values(auth.uid(),p.id,p_agreement) on conflict(user_id,property_id,version_id) do nothing;
 select id into a from public.agreement_acceptances where user_id=auth.uid() and property_id=p.id and version_id=p_agreement;
 insert into public.marketing_mandates(seller_id,property_id,kind,basis_points,acceptance_id) values(auth.uid(),p.id,'percentage',coalesce((select (value->>'basis_points')::int from public.system_settings where key='commission'),200),a) on conflict(property_id) do nothing;
 update public.properties set status='submitted',plan_snapshot=coalesce(plan_snapshot,to_jsonb(plan)),updated_at=now() where id=p.id;
 perform app_private.audit('listing_submitted','property',p.id);
 perform app_private.notify(auth.uid(),'listing_submitted','Listing submitted',p.reference||' is awaiting review.');
end; $$;

create function public.moderate_property(p_id uuid,p_decision text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare p public.properties; days int; begin
 if not app_private.has_permission('moderate') or length(p_reason)<5 then raise exception 'Moderation permission and reason required'; end if;
 select * into p from public.properties where id=p_id for update;
 if p.id is null or p.seller_id=auth.uid() then raise exception 'Cannot moderate this property'; end if;
 if not ((p.status='submitted' and p_decision='under_review') or (p.status='under_review' and p_decision in ('live','needs_changes','rejected')) or (p.status in ('live','under_offer') and p_decision='paused')) then raise exception 'Invalid moderation transition'; end if;
 if p_decision='live' and p.plan_snapshot is null then raise exception 'Listing plan snapshot missing'; end if;
 days:=coalesce((p.plan_snapshot->>'duration_days')::int,30);
 update public.properties set status=p_decision,published_at=case when p_decision='live' then coalesce(published_at,now()) else published_at end,expires_at=case when p_decision='live' then now()+make_interval(days=>days) else expires_at end,updated_at=now() where id=p.id;
 insert into public.moderation_reviews(property_id,actor_id,decision,reason) values(p.id,auth.uid(),p_decision,p_reason);
 perform app_private.audit('moderation_'||p_decision,'property',p.id,jsonb_build_object('reason',p_reason));
 perform app_private.notify(p.seller_id,'listing_update','Listing review updated',p.reference||': '||replace(p_decision,'_',' ')||'. '||p_reason);
end; $$;

create function public.buyer_action(p_property uuid,p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; p public.properties; begin
 if not app_private.active_user() then raise exception 'Active account required'; end if;
 if p_action='save' and exists(select 1 from public.saved_properties where user_id=auth.uid() and property_id=p_property) then
 delete from public.saved_properties where user_id=auth.uid() and property_id=p_property;return p_property;end if;
 select * into p from public.properties where id=p_property and status in ('live','under_offer') and expires_at>now();
 if p.id is null or p.seller_id=auth.uid() or p.is_demo then raise exception 'Property unavailable for this action'; end if;
 if p_action='save' then
 if exists(select 1 from public.saved_properties where user_id=auth.uid() and property_id=p.id) then delete from public.saved_properties where user_id=auth.uid() and property_id=p.id;
 else insert into public.saved_properties(user_id,property_id) values(auth.uid(),p.id); end if; return p.id;
 elsif p_action='enquire' then insert into public.enquiries(buyer_id,property_id,message,preferred_contact) values(auth.uid(),p.id,p_data->>'message',coalesce(p_data->>'preferred_contact','email')) returning id into result;
 elsif p_action='inspection' then
 if (p_data->>'preferred_at')::timestamptz<=now() then raise exception 'Choose a future inspection date'; end if;
 insert into public.inspections(property_id,buyer_id,preferred_at,attendees,overseas,notes) values(p.id,auth.uid(),(p_data->>'preferred_at')::timestamptz,coalesce((p_data->>'attendees')::int,1),coalesce((p_data->>'overseas')::boolean,false),coalesce(p_data->>'message','')) returning id into result;
 elsif p_action='offer' then
 insert into public.offers(property_id,buyer_id,amount_minor,conditions) values(p.id,auth.uid(),(p_data->>'amount_minor')::bigint,p_data->>'message') returning id into result;
 insert into public.offer_events(offer_id,actor_id,status,amount_minor,message) values(result,auth.uid(),'submitted',(p_data->>'amount_minor')::bigint,p_data->>'message');
 elsif p_action='report' then insert into public.property_reports(property_id,reporter_id,reason,message) values(p.id,auth.uid(),p_data->>'reason',p_data->>'message') returning id into result;
 else raise exception 'Unknown buyer action'; end if;
 perform app_private.audit('buyer_'||p_action,'property',p.id);
 perform app_private.notify(auth.uid(),p_action,'Request received','Your property team request has been recorded. Reference: '||result::text);
 return result;
end; $$;

create function public.record_verification(p_property uuid,p_type text,p_status text,p_summary text,p_notes text,p_document uuid,p_provider uuid,p_expiry timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.properties; result uuid; begin
 if not app_private.has_permission('verify') then raise exception 'Verification permission required'; end if;
 select * into p from public.properties where id=p_property for update;
 if p.id is null or p.seller_id=auth.uid() then raise exception 'Independent reviewer required'; end if;
 if p_type='identity' and not app_private.has_permission('compliance') then raise exception 'Compliance permission required for identity evidence'; end if;
 if p_document is not null and not exists(select 1 from public.property_documents d join public.document_types t on t.id=d.type_id where d.id=p_document and d.property_id=p.id and (t.classification='property' or app_private.has_permission('compliance'))) then raise exception 'Evidence unavailable'; end if;
 if p_status='completed' then
 if p_document is null or length(p_summary)<20 or length(p_notes)<20 then raise exception 'Evidence and a clear outcome are required'; end if;
 if p_expiry is not null and p_expiry<=now() then raise exception 'Expiry must be in the future'; end if;
 if p_type in ('legal','survey') and not exists(select 1 from public.professional_providers where id=p_provider and active and credentials_confirmed) then raise exception 'A confirmed professional provider is required'; end if;
 if p_type='site' and not exists(select 1 from public.inspections i join public.inspection_evidence e on e.inspection_id=i.id where i.property_id=p.id and i.status='completed' and e.document_id=p_document and e.observed_at>=p.updated_at) then raise exception 'Completed inspection evidence is required'; end if;
 end if;
 insert into public.property_verifications(property_id,type_id,status,officer_id,public_summary,internal_notes,evidence_document_id,provider_id,property_revision,completed_at,expires_at)
 values(p.id,p_type,p_status,auth.uid(),p_summary,p_notes,p_document,p_provider,p.revision,case when p_status='completed' then now() end,p_expiry)
 on conflict(property_id,type_id,property_revision) do update set status=excluded.status,officer_id=excluded.officer_id,public_summary=excluded.public_summary,internal_notes=excluded.internal_notes,evidence_document_id=excluded.evidence_document_id,provider_id=excluded.provider_id,completed_at=excluded.completed_at,expires_at=excluded.expires_at returning id into result;
 perform app_private.audit('verification_'||p_status,'property',p.id,jsonb_build_object('type',p_type,'revision',p.revision));
 return result;
end; $$;

create function public.manage_inspection(p_id uuid,p_status text,p_inspector uuid,p_at timestamptz,p_notes text,p_document uuid) returns void language plpgsql security definer set search_path='' as $$
declare i public.inspections; begin
 select * into i from public.inspections where id=p_id for update;
 if i.id is null then raise exception 'Inspection not found'; end if;
 if p_status='completed' then
 if not app_private.has_permission('inspect') or i.inspector_id is distinct from auth.uid() or i.status<>'confirmed' or length(p_notes)<30 then raise exception 'Assigned inspector and detailed observations required'; end if;
 if not exists(select 1 from public.property_documents where id=p_document and property_id=i.property_id and owner_id=auth.uid() and type_id='inspection' and created_at>=i.created_at) then raise exception 'Inspection evidence required'; end if;
 insert into public.inspection_evidence(inspection_id,observed_at,observations,document_id) values(i.id,now(),p_notes,p_document);
 update public.inspections set status='completed',completed_at=now() where id=i.id;
 else
 if not app_private.has_permission('verify') or p_status not in ('confirmed','cancelled') or i.status='completed' then raise exception 'Inspection assignment permission required'; end if;
 if p_status='confirmed' and not exists(select 1 from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id join public.profiles p on p.id=ur.user_id where ur.user_id=p_inspector and rp.permission_id='inspect' and p.status='active') then raise exception 'Choose an active inspector'; end if;
 update public.inspections set status=p_status,inspector_id=p_inspector,preferred_at=coalesce(p_at,preferred_at) where id=i.id;
 end if;
 perform app_private.audit('inspection_'||p_status,'inspection',i.id);
 if i.buyer_id is not null then perform app_private.notify(i.buyer_id,'inspection_update','Inspection updated','Inspection status: '||p_status); end if;
end; $$;

create function public.respond_offer(p_id uuid,p_status text,p_amount bigint,p_message text) returns void language plpgsql security definer set search_path='' as $$
declare o public.offers; begin
 select * into o from public.offers where id=p_id for update;
 if o.id is null or not app_private.active_user() or not (app_private.has_permission('transactions') or exists(select 1 from public.properties where id=o.property_id and seller_id=auth.uid())) then raise exception 'Offer permission required'; end if;
 if o.status not in ('submitted','countered') or p_status not in ('accepted','rejected','countered') or length(p_message)<5 then raise exception 'Invalid offer response'; end if;
 if p_status='countered' and (p_amount is null or p_amount<=0) then raise exception 'Counter amount required'; end if;
 update public.offers set status=p_status where id=o.id;
 insert into public.offer_events(offer_id,actor_id,status,amount_minor,message) values(o.id,auth.uid(),p_status,p_amount,p_message);
 perform app_private.audit('offer_'||p_status,'offer',o.id);
 perform app_private.notify(o.buyer_id,'offer_update','Offer updated',p_message);
end; $$;

create function public.manage_transaction(p_id uuid,p_property uuid,p_buyer uuid,p_stage text,p_summary text,p_sale bigint) returns uuid language plpgsql security definer set search_path='' as $$
declare t public.transaction_cases; m public.marketing_mandates; result uuid; fee bigint; stages text[]:=array['buyer_qualified','offer_submitted','offer_accepted','verification_pending','due_diligence','professional_review','contract_stage','awaiting_completion','completed']; begin
 if not app_private.has_permission('transactions') or length(p_summary)<10 then raise exception 'Transaction permission and summary required'; end if;
 if p_id is null then
 if not exists(select 1 from public.enquiries where property_id=p_property and buyer_id=p_buyer) and not exists(select 1 from public.offers where property_id=p_property and buyer_id=p_buyer) then raise exception 'A recorded introduction is required'; end if;
 insert into public.transaction_cases(property_id,buyer_id,assigned_to) values(p_property,p_buyer,auth.uid()) returning id into result; p_stage:='buyer_qualified';
 else
 select * into t from public.transaction_cases where id=p_id for update; result:=t.id;
 if t.id is null or t.stage in ('completed','withdrawn','failed') then raise exception 'Transaction cannot be changed'; end if;
 if p_stage not in ('withdrawn','failed','disputed') and (array_position(stages,p_stage) is null or array_position(stages,p_stage)<>coalesce(array_position(stages,t.stage),0)+1) then raise exception 'Complete transaction stages in order'; end if;
 if p_stage='completed' then
 if p_sale is null or p_sale<=0 then raise exception 'Completed sale amount required'; end if;
 select * into m from public.marketing_mandates where property_id=t.property_id and acceptance_id is not null;
 if m.id is null then raise exception 'Accepted commission mandate required'; end if;
 fee:=case when m.kind='waived' then 0 when m.kind='fixed' then m.fixed_minor else greatest(m.minimum_minor,round(p_sale::numeric*m.basis_points/10000)::bigint) end;
 insert into public.commissions(transaction_id,mandate_id,sale_price_minor,amount_minor,basis_snapshot,status) values(t.id,m.id,p_sale,fee,to_jsonb(m),case when m.kind='waived' then 'waived' else 'due' end);
 update public.properties set status='sold',updated_at=now() where id=t.property_id;
 end if;
 update public.transaction_cases set stage=p_stage,sale_price_minor=case when p_stage='completed' then p_sale else sale_price_minor end where id=t.id;
 end if;
 insert into public.transaction_events(transaction_id,stage,summary,actor_id) values(result,p_stage,p_summary,auth.uid());
 perform app_private.audit('transaction_'||p_stage,'transaction',result);
 return result;
end; $$;

create function public.create_order(p_property uuid) returns public.orders language plpgsql security definer set search_path='' as $$
declare p public.properties; plan public.listing_plans; o public.orders; begin
 select * into p from public.properties where id=p_property for update;
 if not app_private.active_user() or p.seller_id is distinct from auth.uid() or p.status not in ('draft','payment_pending','needs_changes') then raise exception 'Checkout not available'; end if;
 select * into plan from public.listing_plans where id=p.plan_id and active;
 if plan.id is null or plan.price_minor<=0 then raise exception 'Choose a paid advertising plan'; end if;
 select * into o from public.orders where property_id=p.id and status='pending';
 if o.id is not null then return o; end if;
 update public.properties set status='payment_pending',plan_snapshot=to_jsonb(plan) where id=p.id;
 insert into public.orders(user_id,property_id,plan_id,plan_snapshot,amount_minor) values(auth.uid(),p.id,plan.id,to_jsonb(plan),plan.price_minor) returning * into o;
 perform app_private.audit('checkout_created','order',o.id); return o;
end; $$;

-- These two functions are granted only to the trusted server integration role.
create function public.fulfil_payment(p_reference text,p_provider text,p_amount bigint,p_currency text) returns void language plpgsql security definer set search_path='' as $$
declare o public.orders; begin
 select * into o from public.orders where reference=p_reference for update;
 if o.id is null or o.amount_minor<>p_amount or o.currency<>p_currency then raise exception 'Payment mismatch'; end if;
 if o.status='paid' and o.provider_id=p_provider then return; end if;
 if o.status<>'pending' then raise exception 'Order not pending'; end if;
 update public.orders set status='paid',paid_at=now(),provider_id=p_provider where id=o.id;
 update public.properties set status='draft' where id=o.property_id and status='payment_pending';
 perform app_private.audit('payment_paid','order',o.id);
 perform app_private.notify(o.user_id,'payment_receipt','Advertising payment received','Payment reference: '||o.reference||'. Submit your listing for moderation when ready.');
end; $$;
create function public.consume_rate_limit(p_key text,p_limit int,p_window int) returns boolean language plpgsql security definer set search_path='' as $$
declare n int; begin
 insert into public.rate_limits(key) values(p_key) on conflict(key) do update set hits=case when public.rate_limits.window_start<now()-make_interval(secs=>p_window) then 1 else public.rate_limits.hits+1 end,window_start=case when public.rate_limits.window_start<now()-make_interval(secs=>p_window) then now() else public.rate_limits.window_start end returning hits into n;
 return n<=p_limit;
end; $$;
create function public.run_maintenance() returns int language plpgsql security definer set search_path='' as $$
declare p record; total int:=0; begin
 for p in update public.properties set status='expired' where status in ('live','under_offer') and expires_at<=now() returning id,seller_id,reference loop
 perform app_private.audit('listing_expired','property',p.id); perform app_private.notify(p.seller_id,'listing_expired','Listing expired',p.reference||' has expired.'); total:=total+1;
 end loop;
 update public.property_verifications set status='expired' where status='completed' and expires_at<=now();
 update public.orders set status='failed' where status='pending' and created_at<now()-interval '48 hours';
 delete from public.rate_limits where window_start<now()-interval '1 day';
 return total;
end; $$;

create function public.admin_config(p_kind text,p_id text,p_data jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if not app_private.has_permission('settings') then raise exception 'Settings permission required'; end if;
 if p_kind='plan' then update public.listing_plans set price_minor=(p_data->>'price_minor')::bigint,duration_days=(p_data->>'duration_days')::int,photo_limit=(p_data->>'photo_limit')::int,video_limit=(p_data->>'video_limit')::int,featured_days=(p_data->>'featured_days')::int,active=coalesce((p_data->>'active')::boolean,true) where id=p_id;
 elsif p_kind='location' then insert into public.locations(name,slug,kind,parent_id,description) values(p_data->>'name',p_data->>'slug',p_data->>'kind',nullif(p_data->>'parent_id','')::uuid,coalesce(p_data->>'description',''));
 elsif p_kind='commission' then
 if (p_data->>'basis_points')::int not between 0 and 10000 then raise exception 'Invalid rate'; end if;
 insert into public.system_settings(key,value) values('commission',p_data) on conflict(key) do update set value=excluded.value;
 else raise exception 'Unknown configuration'; end if;
 perform app_private.audit('settings_updated',p_kind,null,jsonb_build_object('id',p_id));
end; $$;

create function public.feature_property(p_id uuid,p_start timestamptz,p_end timestamptz) returns void language plpgsql security definer set search_path='' as $$
begin if not app_private.has_permission('moderate') then raise exception 'Promotion permission required'; end if;
 insert into public.promotions(property_id,starts_at,ends_at,source,created_by) values(p_id,p_start,p_end,'editorial',auth.uid());
 perform app_private.audit('promotion_scheduled','property',p_id);
end; $$;
create function public.set_account_status(p_id uuid,p_status text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin if not app_private.has_permission('compliance') or p_id=auth.uid() or length(p_reason)<10 then raise exception 'Compliance permission and reason required'; end if;
 update public.profiles set status=p_status where id=p_id;
 if p_status in ('suspended','banned','restricted','closed') then update public.properties set status='paused' where seller_id=p_id and status in ('live','under_offer'); end if;
 perform app_private.audit('account_status','profile',p_id,jsonb_build_object('status',p_status,'reason',p_reason));
end; $$;

-- Revoke the PostgreSQL default PUBLIC execute grant for all public RPCs.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as name from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('update_profile','save_property','select_plan','submit_property','moderate_property','buyer_action','record_verification','manage_inspection','respond_offer','manage_transaction','create_order','fulfil_payment','consume_rate_limit','run_maintenance','admin_config','feature_property','set_account_status') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.name);
 if f.name::text !~ '(fulfil_payment|consume_rate_limit|run_maintenance)' then execute format('grant execute on function %s to authenticated',f.name); end if;
 end loop;
end $$;
grant execute on function public.fulfil_payment(text,text,bigint,text),public.consume_rate_limit(text,int,int),public.run_maintenance() to service_role;


-- Source: supabase/migrations/0003_storage.sql
-- Draft photographs remain private too. The public media route serves only live/inactive approved inventory.
-- Object storage is provided by Cloudflare R2.
-- No client object policies are granted. Server upload validation and authorised short-lived downloads are mandatory.

create function public.attach_upload(p_property uuid,p_owner uuid,p_path text,p_kind text,p_type text,p_name text,p_mime text,p_bytes bigint,p_hash text) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.properties; plan public.listing_plans; result uuid; begin
 select * into p from public.properties where id=p_property for update;
 if p.id is null or p.seller_id<>p_owner or p.status not in ('draft','needs_changes') then raise exception 'Only editable draft uploads are permitted'; end if;
 if not exists(select 1 from public.profiles where id=p_owner and status='active') then raise exception 'Active account required'; end if;
 select * into plan from public.listing_plans where id=p.plan_id;
 if p_kind='image' then
 if p_mime<>'image/webp' or (select count(*) from public.property_media where property_id=p.id and kind='image')>=plan.photo_limit then raise exception 'Photo allowance reached'; end if;
 insert into public.property_media(property_id,storage_path,kind,mime,size_bytes,alt) values(p.id,p_path,p_kind,p_mime,p_bytes,left(p_name,160)) returning id into result;
 elsif p_kind='document' then
 if not exists(select 1 from public.document_types where id=p_type) then raise exception 'Choose a document category'; end if;
 if p_mime not in ('image/webp','application/pdf') then raise exception 'Unsupported evidence format'; end if;
 if (select count(*) from public.property_documents where property_id=p.id)>=30 then raise exception 'Document allowance reached'; end if;
 insert into public.property_documents(property_id,owner_id,type_id,storage_path,original_name,mime,sha256) values(p.id,p_owner,p_type,p_path,left(p_name,160),p_mime,p_hash) returning id into result;
 update public.property_verifications set status='expired' where property_id=p.id and status='completed';
 else raise exception 'Unsupported upload category'; end if;
 insert into public.audit_logs(actor_id,action,entity,entity_id) values(p_owner,'file_uploaded',p_kind,result);
 return result;
end; $$;
revoke all on function public.attach_upload(uuid,uuid,text,text,text,text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.attach_upload(uuid,uuid,text,text,text,text,text,bigint,text) to service_role;


-- Source: supabase/migrations/0004_operations.sql
-- Staff uploads are independently authorised; inspectors are limited to their assigned case.
create function public.attach_staff_evidence(p_property uuid,p_actor uuid,p_path text,p_type text,p_name text,p_mime text,p_hash text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; begin
 if not exists(select 1 from public.profiles where id=p_actor and status='active') then raise exception 'Active staff account required'; end if;
 if not exists(select 1 from public.user_roles ur join public.role_permissions rp on rp.role_id=ur.role_id where ur.user_id=p_actor and
 ((rp.permission_id='compliance') or (rp.permission_id='verify' and exists(select 1 from public.document_types where id=p_type and classification='property')) or
 (rp.permission_id='inspect' and p_type='inspection' and exists(select 1 from public.inspections where property_id=p_property and inspector_id=p_actor and status='confirmed')))) then raise exception 'Evidence access denied'; end if;
 insert into public.property_documents(property_id,owner_id,type_id,storage_path,original_name,mime,sha256) values(p_property,p_actor,p_type,p_path,p_name,p_mime,p_hash) returning id into result;
 insert into public.audit_logs(actor_id,action,entity,entity_id) values(p_actor,'staff_evidence_uploaded','document',result);
 return result;
end; $$;
revoke all on function public.attach_staff_evidence(uuid,uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.attach_staff_evidence(uuid,uuid,text,text,text,text,text) to service_role;

create function public.update_queue(p_kind text,p_id uuid,p_status text,p_note text,p_assignee uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if length(p_note)<5 then raise exception 'A reason or note is required'; end if;
 if p_kind='enquiry' and app_private.has_permission('support') then
 if p_status not in ('new','contacted','qualified','inspection_requested','inspection_booked','offer_expected','not_interested','closed','spam') then raise exception 'Invalid enquiry status'; end if;
 update public.enquiries set status=p_status,assigned_to=p_assignee where id=p_id;
 elsif p_kind='report' and app_private.has_permission('moderate') then
 if p_status not in ('open','investigating','dismissed','resolved','escalated') then raise exception 'Invalid report status'; end if;
 update public.property_reports set status=p_status where id=p_id;
 elsif p_kind='support' and app_private.has_permission('support') then
 if p_status not in ('open','assigned','resolved','closed') then raise exception 'Invalid support status'; end if;
 update public.support_tickets set status=p_status,assigned_to=p_assignee where id=p_id;
 else raise exception 'Queue permission required'; end if;
 perform app_private.audit('queue_'||p_status,p_kind,p_id,jsonb_build_object('note',p_note,'assignee',p_assignee));
end; $$;
revoke all on function public.update_queue(text,uuid,text,text,uuid) from public,anon;
grant execute on function public.update_queue(text,uuid,text,text,uuid) to authenticated;

create function public.save_content(p_slug text,p_title text,p_description text,p_content text,p_published boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not app_private.has_permission('content') or p_slug !~ '^[a-z0-9-]+$' or length(p_title)<3 or length(p_content)<30 then raise exception 'Content permission and valid text required'; end if;
 insert into public.content_pages(slug,title,description,content,published) values(p_slug,p_title,p_description,p_content,p_published) on conflict(slug) do update set title=excluded.title,description=excluded.description,content=excluded.content,published=excluded.published,updated_at=now();
 perform app_private.audit('content_saved','content',null,jsonb_build_object('slug',p_slug));
end; $$;
revoke all on function public.save_content(text,text,text,text,boolean) from public,anon;
grant execute on function public.save_content(text,text,text,text,boolean) to authenticated;

create table public.video_uploads(id uuid primary key default gen_random_uuid(),property_id uuid not null references public.properties,owner_id uuid not null references public.profiles,path text unique not null,expected_bytes bigint not null,status text not null default 'pending' check(status in ('pending','processing','ready','failed')),created_at timestamptz not null default now());
alter table public.video_uploads enable row level security;
revoke all on public.video_uploads from anon,authenticated;
grant all on public.video_uploads to service_role;
-- Object storage is provided by Cloudflare R2.
-- Object size limits are enforced by the upload service.
create function public.reserve_video(p_property uuid,p_actor uuid,p_path text,p_bytes bigint) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.properties; plan public.listing_plans; result uuid; begin
 select * into p from public.properties where id=p_property for update;
 if p.seller_id is distinct from p_actor or p.status not in ('draft','needs_changes') or not exists(select 1 from public.profiles where id=p_actor and status='active') then raise exception 'Editable draft required'; end if;
 select * into plan from public.listing_plans where id=p.plan_id;
 if p_bytes<=0 or p_bytes>least(plan.video_max_bytes,104857600) then raise exception 'Video exceeds allowed size'; end if;
 if (select count(*) from public.property_media where property_id=p.id and kind='video')+(select count(*) from public.video_uploads where property_id=p.id and status in ('pending','processing') and created_at>now()-interval '2 hours')>=plan.video_limit then raise exception 'Video allowance reached'; end if;
 insert into public.video_uploads(property_id,owner_id,path,expected_bytes) values(p.id,p_actor,p_path,p_bytes) returning id into result; return result;
end; $$;
create function public.finish_video(p_id uuid,p_path text,p_bytes bigint,p_duration numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare v public.video_uploads; p public.properties; plan public.listing_plans; result uuid; begin
 select * into v from public.video_uploads where id=p_id for update;
 select * into p from public.properties where id=v.property_id for update;
 select * into plan from public.listing_plans where id=p.plan_id;
 if v.status<>'processing' or p.status not in ('draft','needs_changes') or p_duration<=0 or p_duration>plan.video_seconds or p_bytes>least(plan.video_max_bytes,104857600) then raise exception 'Video cannot be attached'; end if;
 if (select count(*) from public.property_media where property_id=p.id and kind='video')>=plan.video_limit then raise exception 'Video allowance reached'; end if;
 insert into public.property_media(property_id,storage_path,kind,mime,size_bytes,alt) values(p.id,p_path,'video','video/mp4',p_bytes,'Property video') returning id into result;
 update public.video_uploads set status='ready' where id=v.id;
 insert into public.audit_logs(actor_id,action,entity,entity_id) values(v.owner_id,'video_uploaded','property',p.id);return result;
end; $$;
revoke all on function public.reserve_video(uuid,uuid,text,bigint),public.finish_video(uuid,text,bigint,numeric) from public,anon,authenticated;
grant execute on function public.reserve_video(uuid,uuid,text,bigint),public.finish_video(uuid,text,bigint,numeric) to service_role;

-- Prevent a seller submitting while files are still being processed.
create function app_private.guard_submission() returns trigger language plpgsql set search_path='' as $$
begin if new.status='submitted' and exists(select 1 from public.video_uploads where property_id=new.id and status in ('pending','processing') and created_at>now()-interval '2 hours') then raise exception 'Wait for video processing to complete'; end if; return new; end; $$;
create trigger guard_submission before update on public.properties for each row execute function app_private.guard_submission();

-- Inactive expired listings retain URLs but cannot appear as available before the scheduled job runs.
create or replace view public.public_properties as
select p.id,p.reference,p.slug,p.title,p.description,p.category,l.name area,l.slug area_slug,p.price_minor,p.bedrooms,p.bathrooms,p.land_sqm,p.features,
 u.seller_type,case when p.status in ('live','under_offer') and p.expires_at<=now() then 'expired' else p.status end status,p.created_at,p.updated_at,
 exists(select 1 from public.promotions x where x.property_id=p.id and x.starts_at<=now() and x.ends_at>now()) featured,
 exists(select 1 from public.price_history h where h.property_id=p.id and h.new_minor<h.previous_minor and h.created_at>now()-interval '30 days') price_reduced,
 coalesce((select jsonb_agg('/api/media/'||m.id order by m.created_at) from public.property_media m where m.property_id=p.id and m.kind='image' and m.status='ready'),'[]') images,
 coalesce((select jsonb_agg(jsonb_build_object('type',v.type_id,'summary',v.public_summary,'completed_at',v.completed_at,'expires_at',v.expires_at)) from public.property_verifications v where v.property_id=p.id and v.status='completed' and v.property_revision=p.revision and (v.expires_at is null or v.expires_at>now())),'[]') checks,
 coalesce((select jsonb_agg('/api/media/'||m.id order by m.created_at) from public.property_media m where m.property_id=p.id and m.kind='video' and m.status='ready'),'[]') videos
from public.properties p join public.locations l on l.id=p.location_id join public.profiles u on u.id=p.seller_id
where p.status in ('live','under_offer','sold','expired') and p.published_at is not null and u.status='active' and not p.is_demo;


-- Source: supabase/migrations/0005_release_controls.sql
grant usage on schema app_private to anon,anonymous;
grant execute on function app_private.has_permission(text) to anon,anonymous;

-- No unaudited deletions or mutations of legal/audit history even from privileged service integrations.
create function app_private.immutable_record() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'This historical record is immutable'; end; $$;
create trigger audit_immutable before update or delete on public.audit_logs for each row execute function app_private.immutable_record();
create trigger revisions_immutable before update or delete on public.property_revisions for each row execute function app_private.immutable_record();
create trigger offer_history_immutable before update or delete on public.offer_events for each row execute function app_private.immutable_record();
create trigger transaction_history_immutable before update or delete on public.transaction_events for each row execute function app_private.immutable_record();
create trigger acceptance_immutable before update or delete on public.agreement_acceptances for each row execute function app_private.immutable_record();
-- Agreement availability may change; historical document text, version and hash may not.
create function app_private.agreement_immutable() returns trigger language plpgsql set search_path='' as $$ begin
 if tg_op='DELETE' or new.content is distinct from old.content or new.sha256 is distinct from old.sha256 or new.version is distinct from old.version or new.kind is distinct from old.kind then raise exception 'Publish a new agreement version'; end if;return new;end; $$;
create trigger agreement_immutable before update or delete on public.agreement_versions for each row execute function app_private.agreement_immutable();
create unique index one_active_agreement_per_kind on public.agreement_versions(kind) where active;

create function public.save_organisation(p_name text,p_kind text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;begin
 if not app_private.active_user() or length(p_name)<3 or length(p_name)>160 or p_kind not in ('agency','developer','company') then raise exception 'Valid organisation details required'; end if;
 select id into result from public.organisations where created_by=auth.uid() limit 1;
 if result is null then insert into public.organisations(name,kind,created_by) values(p_name,p_kind,auth.uid()) returning id into result;insert into public.organisation_members values(result,auth.uid(),'owner');
 else update public.organisations set name=p_name,kind=p_kind where id=result;end if;
 perform app_private.audit('organisation_saved','organisation',result);return result;
end; $$;
revoke all on function public.save_organisation(text,text) from public,anon;
grant execute on function public.save_organisation(text,text) to authenticated;

create function public.update_commission(p_id uuid,p_status text,p_reference text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not app_private.has_permission('finance') or p_status not in ('due','invoiced','partially_paid','paid','waived','disputed','written_off') or length(p_reference)<3 then raise exception 'Finance permission and accounting reference required';end if;
 update public.commissions set status=p_status,invoice_reference=p_reference,paid_at=case when p_status='paid' then now() else paid_at end where id=p_id;
 perform app_private.audit('commission_'||p_status,'commission',p_id,jsonb_build_object('reference',p_reference));
end; $$;
revoke all on function public.update_commission(uuid,text,text) from public,anon;
grant execute on function public.update_commission(uuid,text,text) to authenticated;

-- Short private media requests always check a current account, not just possession of an old session.
create policy documents_active on public.property_documents as restrictive for select to authenticated using(app_private.active_user());
create policy media_active on public.property_media as restrictive for select to authenticated using(app_private.active_user());
create policy exact_location_active on public.property_private as restrictive for select to authenticated using(app_private.active_user());

-- Service role needs only intentional entrypoints; enforce explicit grants independently of Supabase defaults.
grant all on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;

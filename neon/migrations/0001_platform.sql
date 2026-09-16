-- Neon compatibility layer for the original PostgreSQL schema.
-- Neon Data API owns auth.*, anonymous, and authenticated. Application RLS
-- helpers live in app_auth so they never depend on privileges in managed schemas.
create schema if not exists app_auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  -- The Neon Data API provisioner owns the anonymous and authenticated roles.
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
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

grant usage on schema app_auth to anon, anonymous, authenticated, service_role;
grant execute on function app_auth.jwt(), app_auth.uid() to anon, anonymous, authenticated, service_role;


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
 where ur.user_id=app_auth.uid() and u.status='active' and rp.permission_id=p and coalesce(app_auth.jwt()->>'aal','')='aal2');
$$;
create function app_private.active_user() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=app_auth.uid() and status='active');
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
 insert into public.audit_logs(actor_id,action,entity,entity_id,metadata) values(app_auth.uid(),action,entity,entity_id,metadata);
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
create policy profiles_read on public.profiles for select using(id=app_auth.uid() or app_private.has_permission('moderate') or app_private.has_permission('compliance'));
create policy properties_read on public.properties for select using(seller_id=app_auth.uid() or app_private.has_permission('moderate') or app_private.has_permission('verify') or app_private.has_permission('transactions'));
create policy private_read on public.property_private for select using(exists(select 1 from public.properties p where p.id=property_id and p.seller_id=app_auth.uid()) or app_private.has_permission('moderate') or app_private.has_permission('verify'));
create policy revisions_read on public.property_revisions for select using(app_private.has_permission('moderate'));
create policy price_read on public.price_history for select using(app_private.has_permission('moderate'));
create policy media_read on public.property_media for select using(exists(select 1 from public.properties p where p.id=property_id));
create policy documents_read on public.property_documents for select using(owner_id=app_auth.uid() or (app_private.has_permission('compliance')) or (app_private.has_permission('verify') and exists(select 1 from public.document_types d where d.id=type_id and d.classification='property')));
create policy document_types_read on public.document_types for select using(true);
create policy verifications_read on public.property_verifications for select using(app_private.has_permission('verify'));
create policy reviews_read on public.moderation_reviews for select using(app_private.has_permission('moderate') or exists(select 1 from public.properties p where p.id=property_id and p.seller_id=app_auth.uid()));
create policy risk_read on public.risk_flags for select using(app_private.has_permission('moderate'));
create policy enquiries_read on public.enquiries for select using(buyer_id=app_auth.uid() or app_private.has_permission('support') or app_private.has_permission('transactions'));
create policy saves_read on public.saved_properties for select using(user_id=app_auth.uid());
create policy inspections_read on public.inspections for select using(buyer_id=app_auth.uid() or (inspector_id=app_auth.uid() and app_private.has_permission('inspect')) or app_private.has_permission('verify') or app_private.has_permission('support'));
create policy evidence_read on public.inspection_evidence for select using(app_private.has_permission('verify') or exists(select 1 from public.inspections i where i.id=inspection_id and i.inspector_id=app_auth.uid() and app_private.has_permission('inspect')));
create policy offers_read on public.offers for select using(buyer_id=app_auth.uid() or app_private.has_permission('transactions') or exists(select 1 from public.properties p where p.id=property_id and p.seller_id=app_auth.uid()));
create policy offer_events_read on public.offer_events for select using(exists(select 1 from public.offers o where o.id=offer_id));
create policy transactions_read on public.transaction_cases for select using(buyer_id=app_auth.uid() or app_private.has_permission('transactions') or exists(select 1 from public.properties p where p.id=property_id and p.seller_id=app_auth.uid()));
create policy timeline_read on public.transaction_events for select using(exists(select 1 from public.transaction_cases t where t.id=transaction_id));
create policy agreements_read on public.agreement_versions for select using(active or app_private.has_permission('settings') or exists(select 1 from public.agreement_acceptances a where a.version_id=id and a.user_id=app_auth.uid()));
create policy acceptances_read on public.agreement_acceptances for select using(user_id=app_auth.uid() or app_private.has_permission('compliance'));
create policy mandates_read on public.marketing_mandates for select using(seller_id=app_auth.uid() or app_private.has_permission('transactions') or app_private.has_permission('finance'));
create policy commissions_read on public.commissions for select using(app_private.has_permission('finance'));
create policy orders_read on public.orders for select using(user_id=app_auth.uid() or app_private.has_permission('finance'));
create policy reports_read on public.property_reports for select using(reporter_id=app_auth.uid() or app_private.has_permission('moderate'));
create policy tickets_read on public.support_tickets for select using(user_id=app_auth.uid() or app_private.has_permission('support'));
create policy notifications_read on public.notifications for select using(user_id=app_auth.uid());
create policy audits_read on public.audit_logs for select using(app_private.has_permission('audit'));
create policy settings_read on public.system_settings for select using(app_private.has_permission('settings'));
create policy providers_read on public.professional_providers for select using(app_private.has_permission('verify'));
create policy promotions_read on public.promotions for select using(app_private.has_permission('moderate'));
create policy organisations_read on public.organisations for select using(created_by=app_auth.uid() or app_private.has_permission('moderate'));
create policy members_read on public.organisation_members for select using(user_id=app_auth.uid());

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
 update public.profiles set full_name=p_name,phone=p_phone,seller_type=p_type where id=app_auth.uid();
end; $$;

create function public.save_property(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.properties; result uuid; loc uuid; begin
 if not app_private.active_user() then raise exception 'Active account required'; end if;
 loc:=(p_data->>'location_id')::uuid;
 if not exists(select 1 from public.locations where id=loc and active and kind in ('area','estate','city')) then raise exception 'Choose an available area'; end if;
 if p_id is null then
 insert into public.properties(seller_id,title,category,location_id,description,price_minor,bedrooms,bathrooms,land_sqm,title_type,features)
 values(app_auth.uid(),p_data->>'title',p_data->>'category',loc,coalesce(p_data->>'description',''),(p_data->>'price_minor')::bigint,nullif(p_data->>'bedrooms','')::int,nullif(p_data->>'bathrooms','')::int,(p_data->>'land_sqm')::numeric,coalesce(p_data->>'title_type',''),array(select jsonb_array_elements_text(coalesce(p_data->'features','[]')))) returning id into result;
 update public.properties set slug=trim(both '-' from regexp_replace(lower(title),'[^a-z0-9]+','-','g'))||'-'||lower(reference) where id=result;
 insert into public.property_private(property_id,address,ownership,latitude,longitude,survey_reference) values(result,coalesce(p_data->>'address',''),coalesce(p_data->>'ownership',''),nullif(p_data->>'latitude','')::numeric,nullif(p_data->>'longitude','')::numeric,coalesce(p_data->>'survey_reference',''));
 else
 select * into p from public.properties where id=p_id for update;
 if p.seller_id is distinct from app_auth.uid() or p.status not in ('draft','needs_changes','live','paused','under_offer','rejected','expired') then raise exception 'Listing cannot be edited'; end if;
 insert into public.property_revisions(property_id,actor_id,revision,snapshot) values(p.id,app_auth.uid(),p.revision,to_jsonb(p));
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
 if not app_private.active_user() or p.seller_id is distinct from app_auth.uid() or p.status not in ('draft','needs_changes','payment_pending') then raise exception 'Plan cannot be changed'; end if;
 select * into plan from public.listing_plans where id=p_plan and active;
 if plan.id is null then raise exception 'Plan unavailable'; end if;
 if (select count(*) from public.property_media where property_id=p.id and kind='image')>plan.photo_limit or (select count(*) from public.property_media where property_id=p.id and kind='video')>plan.video_limit then raise exception 'Remove media exceeding this plan allowance'; end if;
 update public.orders set status='failed' where property_id=p.id and status='pending';
 update public.properties set plan_id=plan.id,plan_snapshot=to_jsonb(plan),status='draft' where id=p.id;
end; $$;

create function public.submit_property(p_id uuid,p_agreement uuid) returns void language plpgsql security definer set search_path='' as $$
declare p public.properties; plan public.listing_plans; a uuid; begin
 select * into p from public.properties where id=p_id for update;
 if not app_private.active_user() or p.seller_id is distinct from app_auth.uid() or p.status not in ('draft','needs_changes','payment_pending') then raise exception 'Listing cannot be submitted'; end if;
 select * into plan from public.listing_plans where id=p.plan_id and active;
 if plan.id is null then raise exception 'Select an available plan'; end if;
 if length(p.description)<50 or not exists(select 1 from public.profiles where id=app_auth.uid() and length(full_name)>1 and length(phone)>5) then raise exception 'Complete your profile and property description'; end if;
 if not exists(select 1 from public.property_media where property_id=p.id and kind='image' and status='ready') then raise exception 'Add at least one property photograph'; end if;
 if not exists(select 1 from public.property_documents d join public.document_types dt on dt.id=d.type_id where d.property_id=p.id and dt.classification='property') then raise exception 'Upload available ownership or marketing evidence'; end if;
 if not exists(select 1 from public.agreement_versions where id=p_agreement and kind='seller' and active and legal_approved) then raise exception 'Approved seller terms are not yet available'; end if;
 if plan.price_minor>0 and not exists(select 1 from public.orders where property_id=p.id and plan_id=p.plan_id and status='paid' and plan_snapshot=p.plan_snapshot) then raise exception 'Complete the advertising payment before submitting'; end if;
 insert into public.agreement_acceptances(user_id,property_id,version_id) values(app_auth.uid(),p.id,p_agreement) on conflict(user_id,property_id,version_id) do nothing;
 select id into a from public.agreement_acceptances where user_id=app_auth.uid() and property_id=p.id and version_id=p_agreement;
 insert into public.marketing_mandates(seller_id,property_id,kind,basis_points,acceptance_id) values(app_auth.uid(),p.id,'percentage',coalesce((select (value->>'basis_points')::int from public.system_settings where key='commission'),200),a) on conflict(property_id) do nothing;
 update public.properties set status='submitted',plan_snapshot=coalesce(plan_snapshot,to_jsonb(plan)),updated_at=now() where id=p.id;
 perform app_private.audit('listing_submitted','property',p.id);
 perform app_private.notify(app_auth.uid(),'listing_submitted','Listing submitted',p.reference||' is awaiting review.');
end; $$;

create function public.moderate_property(p_id uuid,p_decision text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare p public.properties; days int; begin
 if not app_private.has_permission('moderate') or length(p_reason)<5 then raise exception 'Moderation permission and reason required'; end if;
 select * into p from public.properties where id=p_id for update;
 if p.id is null or p.seller_id=app_auth.uid() then raise exception 'Cannot moderate this property'; end if;
 if not ((p.status='submitted' and p_decision='under_review') or (p.status='under_review' and p_decision in ('live','needs_changes','rejected')) or (p.status in ('live','under_offer') and p_decision='paused')) then raise exception 'Invalid moderation transition'; end if;
 if p_decision='live' and p.plan_snapshot is null then raise exception 'Listing plan snapshot missing'; end if;
 days:=coalesce((p.plan_snapshot->>'duration_days')::int,30);
 update public.properties set status=p_decision,published_at=case when p_decision='live' then coalesce(published_at,now()) else published_at end,expires_at=case when p_decision='live' then now()+make_interval(days=>days) else expires_at end,updated_at=now() where id=p.id;
 insert into public.moderation_reviews(property_id,actor_id,decision,reason) values(p.id,app_auth.uid(),p_decision,p_reason);
 perform app_private.audit('moderation_'||p_decision,'property',p.id,jsonb_build_object('reason',p_reason));
 perform app_private.notify(p.seller_id,'listing_update','Listing review updated',p.reference||': '||replace(p_decision,'_',' ')||'. '||p_reason);
end; $$;

create function public.buyer_action(p_property uuid,p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; p public.properties; begin
 if not app_private.active_user() then raise exception 'Active account required'; end if;
 if p_action='save' and exists(select 1 from public.saved_properties where user_id=app_auth.uid() and property_id=p_property) then
 delete from public.saved_properties where user_id=app_auth.uid() and property_id=p_property;return p_property;end if;
 select * into p from public.properties where id=p_property and status in ('live','under_offer') and expires_at>now();
 if p.id is null or p.seller_id=app_auth.uid() or p.is_demo then raise exception 'Property unavailable for this action'; end if;
 if p_action='save' then
 if exists(select 1 from public.saved_properties where user_id=app_auth.uid() and property_id=p.id) then delete from public.saved_properties where user_id=app_auth.uid() and property_id=p.id;
 else insert into public.saved_properties(user_id,property_id) values(app_auth.uid(),p.id); end if; return p.id;
 elsif p_action='enquire' then insert into public.enquiries(buyer_id,property_id,message,preferred_contact) values(app_auth.uid(),p.id,p_data->>'message',coalesce(p_data->>'preferred_contact','email')) returning id into result;
 elsif p_action='inspection' then
 if (p_data->>'preferred_at')::timestamptz<=now() then raise exception 'Choose a future inspection date'; end if;
 insert into public.inspections(property_id,buyer_id,preferred_at,attendees,overseas,notes) values(p.id,app_auth.uid(),(p_data->>'preferred_at')::timestamptz,coalesce((p_data->>'attendees')::int,1),coalesce((p_data->>'overseas')::boolean,false),coalesce(p_data->>'message','')) returning id into result;
 elsif p_action='offer' then
 insert into public.offers(property_id,buyer_id,amount_minor,conditions) values(p.id,app_auth.uid(),(p_data->>'amount_minor')::bigint,p_data->>'message') returning id into result;
 insert into public.offer_events(offer_id,actor_id,status,amount_minor,message) values(result,app_auth.uid(),'submitted',(p_data->>'amount_minor')::bigint,p_data->>'message');
 elsif p_action='report' then insert into public.property_reports(property_id,reporter_id,reason,message) values(p.id,app_auth.uid(),p_data->>'reason',p_data->>'message') returning id into result;
 else raise exception 'Unknown buyer action'; end if;
 perform app_private.audit('buyer_'||p_action,'property',p.id);
 perform app_private.notify(app_auth.uid(),p_action,'Request received','Your property team request has been recorded. Reference: '||result::text);
 return result;
end; $$;

create function public.record_verification(p_property uuid,p_type text,p_status text,p_summary text,p_notes text,p_document uuid,p_provider uuid,p_expiry timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.properties; result uuid; begin
 if not app_private.has_permission('verify') then raise exception 'Verification permission required'; end if;
 select * into p from public.properties where id=p_property for update;
 if p.id is null or p.seller_id=app_auth.uid() then raise exception 'Independent reviewer required'; end if;
 if p_type='identity' and not app_private.has_permission('compliance') then raise exception 'Compliance permission required for identity evidence'; end if;
 if p_document is not null and not exists(select 1 from public.property_documents d join public.document_types t on t.id=d.type_id where d.id=p_document and d.property_id=p.id and (t.classification='property' or app_private.has_permission('compliance'))) then raise exception 'Evidence unavailable'; end if;
 if p_status='completed' then
 if p_document is null or length(p_summary)<20 or length(p_notes)<20 then raise exception 'Evidence and a clear outcome are required'; end if;
 if p_expiry is not null and p_expiry<=now() then raise exception 'Expiry must be in the future'; end if;
 if p_type in ('legal','survey') and not exists(select 1 from public.professional_providers where id=p_provider and active and credentials_confirmed) then raise exception 'A confirmed professional provider is required'; end if;
 if p_type='site' and not exists(select 1 from public.inspections i join public.inspection_evidence e on e.inspection_id=i.id where i.property_id=p.id and i.status='completed' and e.document_id=p_document and e.observed_at>=p.updated_at) then raise exception 'Completed inspection evidence is required'; end if;
 end if;
 insert into public.property_verifications(property_id,type_id,status,officer_id,public_summary,internal_notes,evidence_document_id,provider_id,property_revision,completed_at,expires_at)
 values(p.id,p_type,p_status,app_auth.uid(),p_summary,p_notes,p_document,p_provider,p.revision,case when p_status='completed' then now() end,p_expiry)
 on conflict(property_id,type_id,property_revision) do update set status=excluded.status,officer_id=excluded.officer_id,public_summary=excluded.public_summary,internal_notes=excluded.internal_notes,evidence_document_id=excluded.evidence_document_id,provider_id=excluded.provider_id,completed_at=excluded.completed_at,expires_at=excluded.expires_at returning id into result;
 perform app_private.audit('verification_'||p_status,'property',p.id,jsonb_build_object('type',p_type,'revision',p.revision));
 return result;
end; $$;

create function public.manage_inspection(p_id uuid,p_status text,p_inspector uuid,p_at timestamptz,p_notes text,p_document uuid) returns void language plpgsql security definer set search_path='' as $$
declare i public.inspections; begin
 select * into i from public.inspections where id=p_id for update;
 if i.id is null then raise exception 'Inspection not found'; end if;
 if p_status='completed' then
 if not app_private.has_permission('inspect') or i.inspector_id is distinct from app_auth.uid() or i.status<>'confirmed' or length(p_notes)<30 then raise exception 'Assigned inspector and detailed observations required'; end if;
 if not exists(select 1 from public.property_documents where id=p_document and property_id=i.property_id and owner_id=app_auth.uid() and type_id='inspection' and created_at>=i.created_at) then raise exception 'Inspection evidence required'; end if;
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
 if o.id is null or not app_private.active_user() or not (app_private.has_permission('transactions') or exists(select 1 from public.properties where id=o.property_id and seller_id=app_auth.uid())) then raise exception 'Offer permission required'; end if;
 if o.status not in ('submitted','countered') or p_status not in ('accepted','rejected','countered') or length(p_message)<5 then raise exception 'Invalid offer response'; end if;
 if p_status='countered' and (p_amount is null or p_amount<=0) then raise exception 'Counter amount required'; end if;
 update public.offers set status=p_status where id=o.id;
 insert into public.offer_events(offer_id,actor_id,status,amount_minor,message) values(o.id,app_auth.uid(),p_status,p_amount,p_message);
 perform app_private.audit('offer_'||p_status,'offer',o.id);
 perform app_private.notify(o.buyer_id,'offer_update','Offer updated',p_message);
end; $$;

create function public.manage_transaction(p_id uuid,p_property uuid,p_buyer uuid,p_stage text,p_summary text,p_sale bigint) returns uuid language plpgsql security definer set search_path='' as $$
declare t public.transaction_cases; m public.marketing_mandates; result uuid; fee bigint; stages text[]:=array['buyer_qualified','offer_submitted','offer_accepted','verification_pending','due_diligence','professional_review','contract_stage','awaiting_completion','completed']; begin
 if not app_private.has_permission('transactions') or length(p_summary)<10 then raise exception 'Transaction permission and summary required'; end if;
 if p_id is null then
 if not exists(select 1 from public.enquiries where property_id=p_property and buyer_id=p_buyer) and not exists(select 1 from public.offers where property_id=p_property and buyer_id=p_buyer) then raise exception 'A recorded introduction is required'; end if;
 insert into public.transaction_cases(property_id,buyer_id,assigned_to) values(p_property,p_buyer,app_auth.uid()) returning id into result; p_stage:='buyer_qualified';
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
 insert into public.transaction_events(transaction_id,stage,summary,actor_id) values(result,p_stage,p_summary,app_auth.uid());
 perform app_private.audit('transaction_'||p_stage,'transaction',result);
 return result;
end; $$;

create function public.create_order(p_property uuid) returns public.orders language plpgsql security definer set search_path='' as $$
declare p public.properties; plan public.listing_plans; o public.orders; begin
 select * into p from public.properties where id=p_property for update;
 if not app_private.active_user() or p.seller_id is distinct from app_auth.uid() or p.status not in ('draft','payment_pending','needs_changes') then raise exception 'Checkout not available'; end if;
 select * into plan from public.listing_plans where id=p.plan_id and active;
 if plan.id is null or plan.price_minor<=0 then raise exception 'Choose a paid advertising plan'; end if;
 select * into o from public.orders where property_id=p.id and status='pending';
 if o.id is not null then return o; end if;
 update public.properties set status='payment_pending',plan_snapshot=to_jsonb(plan) where id=p.id;
 insert into public.orders(user_id,property_id,plan_id,plan_snapshot,amount_minor) values(app_auth.uid(),p.id,plan.id,to_jsonb(plan),plan.price_minor) returning * into o;
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
 insert into public.promotions(property_id,starts_at,ends_at,source,created_by) values(p_id,p_start,p_end,'editorial',app_auth.uid());
 perform app_private.audit('promotion_scheduled','property',p_id);
end; $$;
create function public.set_account_status(p_id uuid,p_status text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin if not app_private.has_permission('compliance') or p_id=app_auth.uid() or length(p_reason)<10 then raise exception 'Compliance permission and reason required'; end if;
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
 select id into result from public.organisations where created_by=app_auth.uid() limit 1;
 if result is null then insert into public.organisations(name,kind,created_by) values(p_name,p_kind,app_auth.uid()) returning id into result;insert into public.organisation_members values(result,app_auth.uid(),'owner');
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


-- Source: supabase/migrations/0006_property_details.sql
-- Typed, category-aware listing details used by the seller wizard and public search.
alter table public.properties
  add column if not exists property_type text not null default '' check(length(property_type) <= 80),
  add column if not exists negotiable boolean not null default false,
  add column if not exists toilets int check(toilets between 0 and 100),
  add column if not exists living_rooms int check(living_rooms between 0 and 50),
  add column if not exists parking_spaces int check(parking_spaces between 0 and 200),
  add column if not exists building_sqm numeric check(building_sqm > 0),
  add column if not exists property_condition text not null default '' check(property_condition in ('','new','excellent','good','renovation-required','under-construction')),
  add column if not exists furnishing text not null default '' check(furnishing in ('','unfurnished','part-furnished','furnished')),
  add column if not exists details jsonb not null default '{}'::jsonb check(jsonb_typeof(details) = 'object');

create index if not exists properties_extended_filters
  on public.properties(status, category, property_type, bedrooms, land_sqm);

create or replace function public.save_property(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.properties; result uuid; loc uuid; safe_details jsonb; begin
 if not app_private.active_user() then raise exception 'Active account required'; end if;
 loc:=(p_data->>'location_id')::uuid;
 if not exists(select 1 from public.locations where id=loc and active and kind in ('area','estate','city')) then raise exception 'Choose an available area'; end if;
 if not (
   (p_data->>'category'='houses' and p_data->>'property_type' in ('detached-house','semi-detached-house','terraced-house','flat','bungalow')) or
   (p_data->>'category'='land' and p_data->>'property_type' in ('residential-land','commercial-land','mixed-use-land','agricultural-land')) or
   (p_data->>'category'='commercial' and p_data->>'property_type' in ('office','retail','warehouse','hospitality','industrial')) or
   (p_data->>'category'='new-developments' and p_data->>'property_type' in ('residential-development','mixed-use-development','commercial-development'))
 ) then raise exception 'Choose a property type that matches the category'; end if;
 safe_details:=jsonb_strip_nulls(jsonb_build_object(
   'floors',nullif(p_data->'details'->>'floors','')::int,
   'year_built',nullif(p_data->'details'->>'year_built','')::int,
   'intended_use',nullif(p_data->'details'->>'intended_use',''),
   'topography',nullif(p_data->'details'->>'topography',''),
   'fenced',case when p_data->'details'->>'fenced' in ('true','false') then (p_data->'details'->>'fenced')::boolean end,
   'development_status',nullif(p_data->'details'->>'development_status',''),
   'road_access',nullif(p_data->'details'->>'road_access','')
 ));
 if (safe_details ? 'floors' and (safe_details->>'floors')::int not between 1 and 100)
   or (safe_details ? 'year_built' and (safe_details->>'year_built')::int not between 1900 and extract(year from now())::int + 10)
   or (safe_details ? 'intended_use' and safe_details->>'intended_use' not in ('residential','commercial','mixed-use','agricultural'))
   or (safe_details ? 'topography' and safe_details->>'topography' not in ('level','sloping','undulating'))
   or (safe_details ? 'development_status' and safe_details->>'development_status' not in ('undeveloped','partly-developed','serviced'))
   or (safe_details ? 'road_access' and safe_details->>'road_access' not in ('paved','unpaved','limited'))
 then raise exception 'Invalid property details'; end if;
 if p_id is null then
  insert into public.properties(seller_id,title,category,property_type,location_id,description,price_minor,negotiable,bedrooms,bathrooms,toilets,living_rooms,parking_spaces,land_sqm,building_sqm,property_condition,furnishing,details,title_type,features)
  values(app_auth.uid(),p_data->>'title',p_data->>'category',p_data->>'property_type',loc,coalesce(p_data->>'description',''),(p_data->>'price_minor')::bigint,coalesce((p_data->>'negotiable')::boolean,false),nullif(p_data->>'bedrooms','')::int,nullif(p_data->>'bathrooms','')::int,nullif(p_data->>'toilets','')::int,nullif(p_data->>'living_rooms','')::int,nullif(p_data->>'parking_spaces','')::int,(p_data->>'land_sqm')::numeric,nullif(p_data->>'building_sqm','')::numeric,coalesce(p_data->>'property_condition',''),coalesce(p_data->>'furnishing',''),safe_details,coalesce(p_data->>'title_type',''),array(select jsonb_array_elements_text(coalesce(p_data->'features','[]')))) returning id into result;
  update public.properties set slug=trim(both '-' from regexp_replace(lower(title),'[^a-z0-9]+','-','g'))||'-'||lower(reference) where id=result;
  insert into public.property_private(property_id,address,ownership,latitude,longitude,survey_reference) values(result,coalesce(p_data->>'address',''),coalesce(p_data->>'ownership',''),nullif(p_data->>'latitude','')::numeric,nullif(p_data->>'longitude','')::numeric,coalesce(p_data->>'survey_reference',''));
 else
  select * into p from public.properties where id=p_id for update;
  if p.seller_id is distinct from app_auth.uid() or p.status not in ('draft','needs_changes','live','paused','under_offer','rejected','expired') then raise exception 'Listing cannot be edited'; end if;
  insert into public.property_revisions(property_id,actor_id,revision,snapshot) values(p.id,app_auth.uid(),p.revision,to_jsonb(p));
  if p.price_minor<>(p_data->>'price_minor')::bigint then insert into public.price_history(property_id,previous_minor,new_minor) values(p.id,p.price_minor,(p_data->>'price_minor')::bigint); end if;
  update public.properties set title=p_data->>'title',category=p_data->>'category',property_type=p_data->>'property_type',location_id=loc,description=coalesce(p_data->>'description',''),price_minor=(p_data->>'price_minor')::bigint,negotiable=coalesce((p_data->>'negotiable')::boolean,false),bedrooms=nullif(p_data->>'bedrooms','')::int,bathrooms=nullif(p_data->>'bathrooms','')::int,toilets=nullif(p_data->>'toilets','')::int,living_rooms=nullif(p_data->>'living_rooms','')::int,parking_spaces=nullif(p_data->>'parking_spaces','')::int,land_sqm=(p_data->>'land_sqm')::numeric,building_sqm=nullif(p_data->>'building_sqm','')::numeric,property_condition=coalesce(p_data->>'property_condition',''),furnishing=coalesce(p_data->>'furnishing',''),details=safe_details,title_type=coalesce(p_data->>'title_type',''),features=array(select jsonb_array_elements_text(coalesce(p_data->'features','[]'))),
  status=case when p.status in ('live','under_offer','paused') then 'under_review' else 'draft' end,revision=revision+1,updated_at=now() where id=p.id;
  update public.property_private set address=coalesce(p_data->>'address',''),ownership=coalesce(p_data->>'ownership',''),latitude=nullif(p_data->>'latitude','')::numeric,longitude=nullif(p_data->>'longitude','')::numeric,survey_reference=coalesce(p_data->>'survey_reference','') where property_id=p.id;
  update public.property_verifications set status='expired' where property_id=p.id and status='completed';
  perform app_private.audit('material_revision','property',p.id,jsonb_build_object('previous_revision',p.revision)); result:=p.id;
 end if;
 if exists(select 1 from public.property_private a join public.property_private b on lower(a.address)=lower(b.address) and a.property_id<>b.property_id where a.property_id=result and length(a.address)>8) then
  insert into public.risk_flags(property_id,reason) values(result,'Potential address match — manual review required'); end if;
 return result;
end; $$;

drop view public.public_properties;
create view public.public_properties as
select p.id,p.reference,p.slug,p.title,p.description,p.category,l.name area,l.slug area_slug,p.price_minor,p.bedrooms,p.bathrooms,p.land_sqm,p.features,
 u.seller_type,case when p.status in ('live','under_offer') and p.expires_at<=now() then 'expired' else p.status end status,p.created_at,p.updated_at,
 exists(select 1 from public.promotions x where x.property_id=p.id and x.starts_at<=now() and x.ends_at>now()) featured,
 exists(select 1 from public.price_history h where h.property_id=p.id and h.new_minor<h.previous_minor and h.created_at>now()-interval '30 days') price_reduced,
 coalesce((select jsonb_agg('/api/media/'||m.id order by m.created_at) from public.property_media m where m.property_id=p.id and m.kind='image' and m.status='ready'),'[]') images,
 coalesce((select jsonb_agg(jsonb_build_object('type',v.type_id,'summary',v.public_summary,'completed_at',v.completed_at,'expires_at',v.expires_at)) from public.property_verifications v where v.property_id=p.id and v.status='completed' and v.property_revision=p.revision and (v.expires_at is null or v.expires_at>now())),'[]') checks,
 coalesce((select jsonb_agg('/api/media/'||m.id order by m.created_at) from public.property_media m where m.property_id=p.id and m.kind='video' and m.status='ready'),'[]') videos,
 p.property_type,p.negotiable,p.toilets,p.living_rooms,p.parking_spaces,p.building_sqm,p.property_condition,p.furnishing,p.details
from public.properties p join public.locations l on l.id=p.location_id join public.profiles u on u.id=p.seller_id
where p.status in ('live','under_offer','sold','expired') and p.published_at is not null and u.status='active' and not p.is_demo;

grant select on public.public_properties to anon,anonymous,authenticated;


-- Source: supabase/migrations/0007_beta_operations.sql
-- Stage 2.5 controlled-beta and hostile-upload controls.
alter table public.profiles
  add column beta_participant boolean not null default false,
  add column beta_kind text check(beta_kind in ('test_seller','test_buyer','beta_customer','staff_qa'));

alter table public.property_documents
  add column scan_status text not null default 'quarantined'
    check(scan_status in ('uploaded','quarantined','scanning','clean','rejected','manual_review')),
  add column scanned_at timestamptz,
  add column scanner_reference text;
create index document_scan_queue on public.property_documents(scan_status,created_at);

alter table public.verification_types
  add column availability text not null default 'active'
    check(availability in ('active','internal_only','coming_soon','disabled'));
update public.verification_types set availability='coming_soon' where id in ('legal','survey');
update public.verification_types set availability='internal_only' where id='official_search';

create table public.job_runs(
 id bigint generated always as identity primary key,
 job_name text not null,
 status text not null check(status in ('running','succeeded','failed')),
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 processed_count int not null default 0,
 duration_ms int,
 error_summary text
);
alter table public.job_runs enable row level security;
create policy job_runs_read on public.job_runs for select using(app_private.has_permission('audit'));
create policy email_outbox_ops_read on public.email_outbox for select using(app_private.has_permission('audit'));
create index job_runs_latest on public.job_runs(job_name,started_at desc);

create function public.set_document_scan_status(p_id uuid,p_status text,p_reference text) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_status not in ('scanning','clean','rejected','manual_review') then raise exception 'Invalid scan status'; end if;
 update public.property_documents set scan_status=p_status,scanned_at=case when p_status in ('clean','rejected','manual_review') then now() else null end,scanner_reference=nullif(left(p_reference,200),'') where id=p_id;
 if not found then raise exception 'Document not found'; end if;
 insert into public.audit_logs(action,entity,entity_id,metadata) values('document_scan_'||p_status,'document',p_id,jsonb_build_object('reference',left(p_reference,200)));
end; $$;
revoke all on function public.set_document_scan_status(uuid,text,text) from public,anon,authenticated;
grant execute on function public.set_document_scan_status(uuid,text,text) to service_role;

create function public.set_beta_participant(p_id uuid,p_enabled boolean,p_kind text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not app_private.has_permission('compliance') or p_id=app_auth.uid() or length(p_reason)<10 then raise exception 'Compliance permission and reason required'; end if;
 if p_enabled and p_kind not in ('test_seller','test_buyer','beta_customer','staff_qa') then raise exception 'Choose a beta participant type'; end if;
 update public.profiles set beta_participant=p_enabled,beta_kind=case when p_enabled then p_kind else null end where id=p_id;
 if not found then raise exception 'Account not found'; end if;
 perform app_private.audit('beta_participant_updated','profile',p_id,jsonb_build_object('enabled',p_enabled,'kind',p_kind,'reason',left(p_reason,500)));
end; $$;
revoke all on function public.set_beta_participant(uuid,boolean,text,text) from public,anon;
grant execute on function public.set_beta_participant(uuid,boolean,text,text) to authenticated;

create function app_private.require_clean_evidence() returns trigger language plpgsql set search_path='' as $$
begin
 if new.status='completed' and not exists(select 1 from public.verification_types where id=new.type_id and availability in ('active','internal_only')) then
  raise exception 'This verification type is not operational';
 end if;
 if new.status='completed' and (new.evidence_document_id is null or not exists(select 1 from public.property_documents where id=new.evidence_document_id and scan_status='clean')) then
  raise exception 'Malware-cleared evidence is required';
 end if;
 return new;
end; $$;
create trigger verification_clean_evidence before insert or update on public.property_verifications for each row execute function app_private.require_clean_evidence();

create function app_private.require_clean_inspection_evidence() returns trigger language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from public.property_documents where id=new.document_id and scan_status='clean') then raise exception 'Malware-cleared inspection evidence is required'; end if;
 return new;
end; $$;
create trigger inspection_clean_evidence before insert or update on public.inspection_evidence for each row execute function app_private.require_clean_inspection_evidence();

grant all on public.job_runs to service_role;
grant select on public.job_runs to authenticated;
grant usage,select on sequence public.job_runs_id_seq to service_role;

create or replace view public.public_properties as
select p.id,p.reference,p.slug,p.title,p.description,p.category,l.name area,l.slug area_slug,p.price_minor,p.bedrooms,p.bathrooms,p.land_sqm,p.features,
 u.seller_type,case when p.status in ('live','under_offer') and p.expires_at<=now() then 'expired' else p.status end status,p.created_at,p.updated_at,
 exists(select 1 from public.promotions x where x.property_id=p.id and x.starts_at<=now() and x.ends_at>now()) featured,
 exists(select 1 from public.price_history h where h.property_id=p.id and h.new_minor<h.previous_minor and h.created_at>now()-interval '30 days') price_reduced,
 coalesce((select jsonb_agg('/api/media/'||m.id order by m.created_at) from public.property_media m where m.property_id=p.id and m.kind='image' and m.status='ready'),'[]') images,
 coalesce((select jsonb_agg(jsonb_build_object('type',v.type_id,'summary',v.public_summary,'completed_at',v.completed_at,'expires_at',v.expires_at)) from public.property_verifications v join public.verification_types vt on vt.id=v.type_id and vt.availability='active' where v.property_id=p.id and v.status='completed' and v.property_revision=p.revision and (v.expires_at is null or v.expires_at>now())),'[]') checks,
 coalesce((select jsonb_agg('/api/media/'||m.id order by m.created_at) from public.property_media m where m.property_id=p.id and m.kind='video' and m.status='ready'),'[]') videos,
 p.property_type,p.negotiable,p.toilets,p.living_rooms,p.parking_spaces,p.building_sqm,p.property_condition,p.furnishing,p.details
from public.properties p join public.locations l on l.id=p.location_id join public.profiles u on u.id=p.seller_id
where p.status in ('live','under_offer','sold','expired') and p.published_at is not null and u.status='active' and not p.is_demo;

grant select on public.public_properties to anon,anonymous,authenticated;


-- Source: supabase/migrations/0011_approved_legal_documents.sql
-- Publish the owner-approved 14 September 2026 legal documents.
-- Historical text remains immutable; only availability flags may change.
update public.agreement_versions set active=false where kind='terms' and active;
insert into public.agreement_versions(kind,version,content,sha256,legal_approved,active)
values('terms','2026-09-14',$enugu_terms_20260914$# TERMS OF USE

**Effective date: 14 September 2026**

These Terms of Use (“**Terms**”) govern access to and use of **Enugu Properties**, including the website at **https://enuguproperties.com**, user accounts, property listings, enquiries, inspections, verification features, advertising services, transaction-support features and other services made available under the Enugu Properties brand (collectively, the “**Platform**” or “**Services**”).

Enugu Properties is operated by:

**MAGENCY ONLINE SOLUTIONS LTD.**
RC Number: **8229228**
Company Type: **Private Company Limited by Shares**

**Registered Address**

House 10
34V Terraces Estate
Road No. 2
Off Orchid Road
Lekki 106104
Lagos
Nigeria

**General Support:** [support@enuguproperties.com](mailto:support@enuguproperties.com)
**Diaspora Enquiries:** [diaspora@enuguproperties.com](mailto:diaspora@enuguproperties.com)
**WhatsApp:** +234 903 366 0763

In these Terms, “**Enugu Properties**”, “**we**”, “**our**” and “**us**” mean MAGENCY ONLINE SOLUTIONS LTD. when operating the Enugu Properties Platform.

By accessing or using the Platform, creating an account, submitting a Property, making an enquiry, purchasing a Service, requesting an inspection or otherwise using our Services, you agree to these Terms.

If you do not agree, you should not use the Platform.

---

# 1. OUR SERVICE

Enugu Properties is a managed property marketplace designed primarily to help people discover, advertise, investigate and progress purchases of property in Enugu, Nigeria.

Our Services may include:

* Property advertising;
* seller onboarding;
* listing moderation;
* buyer enquiries;
* property inspections;
* identity checks;
* authority-to-market checks;
* document-review workflows;
* official-search coordination;
* survey or legal-professional coordination;
* offers;
* transaction tracking;
* advertising plans;
* diaspora-buyer support;
* other related property services.

The availability of individual Services may change as the Platform develops.

---

# 2. SOFT LAUNCH AND SERVICE AVAILABILITY

Enugu Properties may release Services gradually.

During an early-access or soft-launch period:

* some features may be unavailable;
* some features may be invitation-only;
* some features may be disabled while integrations or operational processes are being tested;
* particular verification services may not yet be offered;
* video, payment, messaging or other functionality may be introduced later.

A feature appearing in our technical architecture or informational material does not mean that the feature is currently available for purchase or use.

We will not knowingly charge you for a Service that we cannot provide.

Where a particular feature is unavailable, we may display it as unavailable, coming soon or temporarily disabled.

---

# 3. IMPORTANT PROPERTY WARNING

Property transactions involve significant financial and legal risk.

A Property appearing on Enugu Properties does **not**, by itself, mean that:

* the Seller owns the Property;
* legal title is perfect;
* documents are genuine;
* the Property is free from litigation;
* there are no competing claims;
* there are no mortgages or encumbrances;
* boundaries are correct;
* government consent has been obtained;
* the Property is free from acquisition or planning restrictions;
* the transaction is safe to complete.

Where Enugu Properties has carried out a specific verification step, the Platform will endeavour to identify precisely what was checked.

Buyers should obtain appropriate legal, survey, official-search and other professional advice before completing a Property purchase.

---

# 4. AGE AND CAPACITY

You must normally be at least 18 years old and legally capable of entering into binding agreements to use transactional features of the Platform.

If you act for:

* a company;
* Property Owner;
* developer;
* family;
* estate;
* agency;
* partnership;
* another person,

you represent that you have appropriate authority to do so.

---

# 5. USER ACCOUNTS

You must provide accurate information when registering.

You are responsible for:

* protecting your login credentials;
* maintaining control of your email account;
* keeping contact information reasonably current;
* preventing unauthorised access to your Account.

You must not:

* impersonate another person;
* create an Account using false identity information;
* use another person's Account without authority;
* attempt to acquire staff or administrator privileges;
* defeat security controls.

Notify us promptly at **[support@enuguproperties.com](mailto:support@enuguproperties.com)** if you believe your Account has been compromised.

---

# 6. OUR ROLE

Enugu Properties may act as:

* marketplace operator;
* Property-marketing intermediary;
* enquiry manager;
* inspection coordinator;
* verification coordinator;
* transaction-support provider.

Our exact role depends on the Service and the particular transaction.

Use of the Platform does not by itself create:

* a solicitor-client relationship;
* a surveyor-client relationship;
* a professional valuation engagement;
* a fiduciary relationship.

A separate Property Marketing Mandate may create specific agency or commission obligations between a Seller and Enugu Properties.

---

# 7. WE ARE NOT A GOVERNMENT AUTHORITY

Enugu Properties is a private business.

We are not:

* the Enugu State Government;
* ENGIS;
* a land registry;
* a planning authority;
* a court;
* a government ministry.

Reference to official searches or government records does not imply government endorsement of Enugu Properties.

---

# 8. PROPERTY LISTINGS

Eligible users may submit Properties for consideration.

Submission does not guarantee publication.

A Property may remain:

* Draft;
* Submitted;
* Under Review;
* Changes Required;
* Rejected;
* Approved;
* Live;
* Paused;
* Under Offer;
* Sold;
* Expired;
* Withdrawn.

We may require additional information before publication.

---

# 9. SELLER RESPONSIBILITIES

A Seller submitting Property represents, to the best of their knowledge, that:

1. they have authority to advertise it;

2. information supplied is not knowingly false or misleading;

3. Property photographs and videos genuinely relate to the Property unless clearly identified otherwise;

4. the asking price is authorised;

5. documents submitted have not knowingly been forged or materially altered;

6. material circumstances requested by Enugu Properties have not deliberately been concealed;

7. they have the right to supply uploaded media and information.

Seller-specific obligations are also governed by the **Seller Terms & Property Marketing Mandate**.

---

# 10. AGENTS

An Agent may be required to prove that they are genuinely authorised to market a Property.

Seeing another Agent's advertisement, obtaining photographs or knowing about a Property does not by itself establish authority to market it.

We may contact an Owner to confirm authority.

---

# 11. LISTING REVIEW

A “Reviewed Listing” means that the Listing has passed the applicable Enugu Properties moderation process.

It does **not** necessarily mean:

* ownership was independently proven;
* title was legally verified;
* documents were authenticated by issuing authorities;
* an official land search was completed;
* a solicitor approved the transaction.

---

# 12. VERIFICATION STATUSES

Different verification statuses mean different things.

### Identity Verified

The relevant person's identity was checked under the applicable procedure.

This does not prove Property ownership.

### Authority to Market Confirmed

Evidence supporting authority to advertise was reviewed.

This does not by itself establish good legal title.

### Site Inspected

The Property or site was physically visited under the applicable inspection procedure.

This does not establish ownership.

### Documents Reviewed

Certain submitted documents were reviewed at the stated level.

This does not necessarily mean the issuing authority authenticated them.

### Official Search Completed

An identified official search was completed and recorded.

Its scope, date and limitations remain relevant.

### Survey Reviewed

Relevant survey information was reviewed through the applicable professional or operational procedure.

### Legal Due Diligence Completed

A defined legal review was completed through an appropriately qualified professional.

Only verification services currently enabled by Enugu Properties should be treated as available.

---

# 13. VERIFICATION CANNOT BE BOUGHT

Advertising and verification are separate.

Purchasing:

* Plus;
* Premium;
* Featured placement;
* advertising boosts;
* promotional services

does not purchase a Verification badge.

---

# 14. VERIFICATION MAY CHANGE

Verification reflects circumstances and information available at a particular time.

We may suspend, expire or remove a verification where:

* material Property details change;
* documentation changes;
* credible contrary information emerges;
* the verification becomes outdated;
* a complaint raises legitimate concerns.

---

# 15. PROPERTY INSPECTIONS

Where available, users may request physical or remote inspections.

Unless expressly described otherwise, an ordinary Enugu Properties inspection is **not**:

* a structural survey;
* valuation;
* title investigation;
* engineering report;
* environmental assessment;
* planning approval.

---

# 16. PROFESSIONAL SERVICES

Property transactions may require independent:

* solicitors;
* licensed surveyors;
* registered estate surveyors and valuers;
* engineers;
* architects;
* tax professionals.

Where an independent Professional Provider carries out work, that provider remains responsible for their professional service.

Enugu Properties must not be treated as providing regulated professional services merely because we coordinate access to a professional.

---

# 17. BUYER RESPONSIBILITIES

Before completing a purchase, Buyers should consider appropriate steps including:

* inspecting the Property;
* verifying Seller identity;
* confirming authority to sell;
* reviewing title documentation;
* obtaining official searches;
* obtaining legal advice;
* checking surveys and boundaries;
* investigating disputes and encumbrances;
* confirming payment instructions independently.

Never transfer significant Property purchase money solely because a Property appears on our website.

---

# 18. DIASPORA BUYERS

Enugu Properties may assist Buyers located outside Nigeria.

Services may include:

* enquiries;
* remote inspections;
* video inspections where available;
* document coordination;
* transaction updates;
* professional-service coordination.

Diaspora enquiries may be sent to:

**[diaspora@enuguproperties.com](mailto:diaspora@enuguproperties.com)**

We do not currently represent that Enugu Properties maintains a United Kingdom office unless and until UK contact information is expressly published.

---

# 19. ENQUIRIES

When a Buyer enquires about a Property, we may create a record linking:

* Buyer;
* Property;
* Seller;
* enquiry;
* inspection;
* subsequent offer or transaction.

We may share information reasonably necessary to progress the enquiry.

---

# 20. SELLER CONTACT INFORMATION

We may withhold a Seller's direct:

* phone;
* email;
* WhatsApp;
* exact Property address

from public display.

Buyer communications may instead be routed through Enugu Properties.

---

# 21. OFFERS

Where available, the Platform may allow Buyers to submit offers.

An offer or acceptance recorded through Enugu Properties does not by itself:

* transfer ownership;
* replace formal conveyancing documents;
* establish legal title;
* satisfy statutory consent requirements;
* constitute registration of Property.

A recent Nigerian Supreme Court decision also reinforces the importance of a genuine agency relationship and effective causal role when commission is claimed, rather than commission arising merely from unsolicited introduction.

---

# 22. TRANSACTION CASES

We may maintain a private transaction record containing milestones such as:

* enquiry;
* inspection;
* offer;
* acceptance;
* due diligence;
* contract stage;
* completion.

These statuses are administrative records.

They are not substitutes for legal documents.

---

# 23. PROPERTY PURCHASE MONEY

Unless Enugu Properties expressly introduces and identifies a properly structured escrow or payment service in the future:

**Do not send Property purchase money to Enugu Properties.**

Normal online payments to Enugu Properties are intended only for clearly identified Platform Services.

---

# 24. LISTING PLANS

We may provide free and paid Listing plans.

Plans may differ by:

* Listing duration;
* photographs;
* video where enabled;
* analytics;
* search placement;
* featured exposure;
* other promotional features.

Prices and material features must be disclosed before purchase.

---

# 25. DISABLED FEATURES

Where a feature such as video uploading, online payment or a particular verification service is disabled, users must not rely on old promotional material or screenshots as evidence that it is currently available.

The live Platform and checkout information control current availability.

---

# 26. PAYMENTS FOR PLATFORM SERVICES

Where enabled, payments may be processed through providers such as Paystack.

A browser redirect to Enugu Properties is not independent proof that payment succeeded.

We may verify payment server-side before activating the Service.

---

# 27. REFUNDS

Refund requests are considered in accordance with applicable law.

In general:

* duplicate charges should be corrected;
* Services we fail to supply may qualify for an appropriate remedy;
* advertising already materially delivered may not be fully refundable;
* Seller withdrawal does not automatically create a refund;
* payment does not guarantee approval of a fraudulent or non-compliant Listing.

Nothing in these Terms removes mandatory consumer rights.

---

# 28. SUCCESS COMMISSION

Where a Seller enters a separate Property Marketing Mandate, Enugu Properties may become entitled to the specifically agreed Success Fee when the conditions of that Mandate are met.

The applicable:

* commission percentage;
* fixed fee;
* completion trigger;
* introduced-Buyer provisions;
* mandate duration;
* Tail Period

must appear in the Seller's accepted mandate.

There is no undisclosed Success Fee merely because these general Terms exist.

---

# 29. FRAUD PREVENTION AND COMPLIANCE

We may request information reasonably necessary for:

* identity checks;
* authority checks;
* fraud prevention;
* anti-money laundering compliance;
* legal obligations;
* Property investigation.

We may pause or decline Services where legitimate concerns exist.

---

# 30. PROHIBITED USE

You must not use the Platform to:

* advertise Property without authority;
* commit fraud;
* submit forged documents;
* advertise nonexistent Property;
* knowingly misrepresent material Property facts;
* launder money;
* harass users or staff;
* upload malware;
* breach another user's account;
* bypass access controls;
* scrape our database for competing commercial purposes;
* manipulate payments;
* manipulate verification;
* falsely claim staff or professional status.

---

# 31. PROPERTY REPORTS

Users may report suspicious Listings.

Reports must be made honestly.

We may pause a Property while investigating a credible report.

A report does not automatically establish wrongdoing.

---

# 32. CONTENT LICENCE

When you upload lawful Property media or descriptions, you grant Enugu Properties a non-exclusive licence to host, resize, display, distribute and promote that material for legitimate Property-marketing and Platform purposes.

You must have appropriate rights to provide the material.

---

# 33. INTELLECTUAL PROPERTY

Enugu Properties owns or licenses the rights in its:

* brand;
* software;
* interface;
* original content;
* database design;
* verification framework;
* graphics.

You must not reproduce substantial parts of the Platform for unauthorised commercial purposes.

---

# 34. THIRD-PARTY SERVICES

The Platform may rely on providers such as:

* Cloudflare;
* Neon;
* payment providers;
* transactional email providers;
* mapping providers;
* Professional Providers.

Their services may occasionally be unavailable.

Their own terms and privacy notices may apply where you interact directly with them.

---

# 35. PRIVACY

Personal information is processed in accordance with our Privacy Policy.

Sensitive Property evidence must not be treated as publicly available merely because it was uploaded through the Platform.

---

# 36. ELECTRONIC COMMUNICATIONS

We may send necessary communications concerning:

* Accounts;
* Listings;
* payments;
* inspections;
* verification;
* enquiries;
* transactions;
* security.

These may be sent by email, in-app notification, telephone or WhatsApp where appropriate.

Optional marketing communications will be treated separately where required.

---

# 37. SERVICE SECURITY

We take reasonable measures designed to protect the Platform.

No online system can be guaranteed completely secure.

Users must independently verify unusual requests concerning:

* money;
* changing bank details;
* passwords;
* identity documents.

---

# 38. SUSPENSION AND TERMINATION

We may reasonably suspend:

* an Account;
* Listing;
* verification;
* transaction process

for reasons including:

* suspected fraud;
* false information;
* security concerns;
* abuse;
* non-payment;
* legal requirements.

Serious concerns may require immediate action.

---

# 39. INFORMATION ACCURACY

Property information may come from:

* Sellers;
* Agents;
* Professional Providers;
* public sources;
* our own inspections.

We take steps intended to improve accuracy but cannot guarantee that every fact remains current.

---

# 40. NO GUARANTEE OF SALE OR INVESTMENT RETURN

We do not guarantee:

* sale;
* enquiries;
* transaction completion;
* achievement of asking price;
* Property appreciation;
* investment return.

Property-market commentary is general information unless expressly stated otherwise.

---

# 41. CONSUMER RIGHTS

Nothing in these Terms removes rights or remedies that cannot lawfully be excluded.

We will not interpret these Terms as excluding liability that Nigerian law does not permit us to exclude.

In particular, nothing excludes liability for our own:

* fraud;
* fraudulent misrepresentation;
* wilful misconduct;
* or other liability that cannot lawfully be excluded.

---

# 42. LIMITATION OF LIABILITY

Subject to mandatory law, Enugu Properties will not ordinarily be responsible for loss caused solely by:

* false information supplied by another user;
* Seller lack of authority;
* a Buyer's failure to undertake reasonable due diligence;
* market movements;
* independent third-party professional conduct;
* payment made contrary to clear safety warnings;
* matters outside our reasonable control.

Any limitation must be interpreted consistently with applicable Nigerian consumer law.

---

# 43. PLATFORM AVAILABILITY

We do not guarantee uninterrupted availability.

We may temporarily suspend parts of the Platform for:

* security;
* maintenance;
* upgrades;
* third-party outages;
* operational reasons.

---

# 44. COMPLAINTS

Complaints should be sent to:

**[support@enuguproperties.com](mailto:support@enuguproperties.com)**

Include your Property, enquiry, payment or transaction reference where available.

---

# 45. DISPUTE RESOLUTION

We encourage users first to contact us and attempt good-faith resolution.

This does not prevent:

* urgent court relief;
* regulatory complaints;
* exercise of mandatory consumer rights.

Separate Seller or commercial agreements may contain additional provisions.

---

# 46. GOVERNING LAW

These Terms are governed by the laws of the **Federal Republic of Nigeria**.

Property transactions may additionally be subject to relevant laws and procedures of the State in which the Property is situated.

---

# 47. CHANGES TO THESE TERMS

We may update these Terms as the Platform develops or legal requirements change.

Material changes may be notified through:

* email;
* Account notice;
* prominent website notice.

We may require acceptance of updated Terms before certain future Services are used.

Historical agreements will retain their applicable version.

---

# 48. SEVERABILITY

If one part of these Terms is invalid or unenforceable, the remaining provisions continue to apply to the extent permitted by law.

---

# 49. CONTACT

**Enugu Properties**
Operated by **MAGENCY ONLINE SOLUTIONS LTD.**

RC Number: **8229228**

House 10
34V Terraces Estate
Road No. 2
Off Orchid Road
Lekki 106104
Lagos
Nigeria

**Support:** [support@enuguproperties.com](mailto:support@enuguproperties.com)
**Diaspora:** [diaspora@enuguproperties.com](mailto:diaspora@enuguproperties.com)
**WhatsApp:** +234 903 366 0763

## END OF TERMS OF USE
$enugu_terms_20260914$,'2d1d608b760dc37af83b6f89008bce937786aa800033eb0cc2714fe01f0269e4',true,true)
on conflict(kind,version) do update set legal_approved=true,active=true;

update public.agreement_versions set active=false where kind='privacy' and active;
insert into public.agreement_versions(kind,version,content,sha256,legal_approved,active)
values('privacy','2026-09-14',$enugu_privacy_20260914$# PRIVACY POLICY

**Effective date: 14 September 2026**

Enugu Properties respects your privacy and is committed to protecting personal information entrusted to us.

This Privacy Policy explains how **MAGENCY ONLINE SOLUTIONS LTD.**, operating as Enugu Properties, collects, uses, stores, discloses, protects and otherwise processes personal data.

**Website:** https://enuguproperties.com

**Company:** MAGENCY ONLINE SOLUTIONS LTD.
**RC Number:** 8229228
**Company Type:** Private Company Limited by Shares

**Registered Address**

House 10
34V Terraces Estate
Road No. 2
Off Orchid Road
Lekki 106104
Lagos
Nigeria

**Support:** [support@enuguproperties.com](mailto:support@enuguproperties.com)
**Diaspora:** [diaspora@enuguproperties.com](mailto:diaspora@enuguproperties.com)
**WhatsApp:** +234 903 366 0763

---

# 1. SCOPE

This Privacy Policy applies to personal data concerning:

* visitors;
* account holders;
* Buyers;
* Sellers;
* Property Owners;
* Agents;
* developers;
* company representatives;
* inspectors;
* Professional Providers;
* diaspora customers;
* support contacts;
* people reporting suspicious Property activity.

---

# 2. APPLICABLE LAW

Our processing is principally governed by the **Nigeria Data Protection Act 2023** and applicable regulations, directives and guidance of the Nigeria Data Protection Commission.

The Nigerian framework recognises rights including access, correction, objection, restriction, portability and erasure in qualifying circumstances, together with protections relating to automated decision-making.

---

# 3. OUR PRIVACY PRINCIPLES

We aim to process personal data:

* lawfully;
* fairly;
* transparently;
* for defined purposes;
* proportionately;
* accurately where necessary;
* securely;
* for no longer than reasonably necessary.

We do not intentionally collect highly sensitive information merely because it might become useful later.

---

# 4. SOFT-LAUNCH SERVICES

Enugu Properties may make Services available progressively.

If a Service is disabled, we do not intentionally collect information through that disabled functionality.

For example, if online payments or video uploads are disabled, the Platform should not invite users to submit related information through those unavailable Services.

---

# 5. ACCOUNT INFORMATION

When you register, we may process:

* first name;
* last name;
* display name;
* email;
* telephone;
* WhatsApp;
* country;
* Account type;
* preferences;
* authentication information.

Passwords should be processed in protected form and are not intended to be readable by ordinary staff.

---

# 6. SELLER INFORMATION

Sellers may provide:

* identity;
* contact details;
* Seller type;
* organisation;
* relationship to Property;
* authority information;
* Listing history;
* Property details;
* asking price;
* photographs;
* documents;
* inspection information.

---

# 7. PROPERTY DOCUMENTS

Depending on the Property, Sellers may submit documents such as:

* Certificate of Occupancy;
* Right of Occupancy;
* Deed of Assignment;
* Deed of Conveyance;
* Allocation Letter;
* Survey Plan;
* Power of Attorney;
* probate documents;
* company records;
* authority-to-market evidence.

These may contain information about people other than the user uploading them.

Private Property documents are not intended to become publicly accessible merely because they are uploaded.

---

# 8. IDENTITY INFORMATION

Where legitimately required, we may process information such as:

* legal name;
* address;
* date of birth;
* photograph;
* government identification;
* identification reference;
* company information.

We aim to collect enhanced identity information only when justified by the relevant Service, transaction or legal requirement.

---

# 9. NATIONAL IDENTIFICATION INFORMATION

We do not require highly sensitive national identification information from ordinary website visitors.

Where such information becomes legitimately necessary for verification or legal compliance, we aim to:

* collect only what is justified;
* restrict access;
* protect it;
* avoid public disclosure;
* apply appropriate retention controls.

Do not send national identification information through ordinary contact forms unless specifically requested through an approved secure process.

---

# 10. PROPERTY LOCATION

We may process:

* State;
* LGA;
* town;
* area;
* estate;
* address;
* latitude;
* longitude.

Exact coordinates may be stored privately while only an approximate area is shown publicly.

---

# 11. INSPECTION INFORMATION

Property inspections may generate:

* date;
* time;
* Property reference;
* inspector;
* photographs;
* video where enabled;
* location confirmation;
* GPS;
* notes;
* observations;
* representative present.

Inspection evidence is generally restricted unless specific information is deliberately approved for public display.

---

# 12. BUYER INFORMATION

Buyer information may include:

* name;
* email;
* telephone;
* WhatsApp;
* country;
* enquiries;
* saved Properties;
* inspection requests;
* offers;
* transaction communications.

---

# 13. DIASPORA INFORMATION

Where you contact us from outside Nigeria, we may process:

* country of residence;
* contact details;
* Property interests;
* remote-inspection needs;
* communication preferences.

Diaspora enquiries may be handled through:

**[diaspora@enuguproperties.com](mailto:diaspora@enuguproperties.com)**

We currently do not represent that we maintain a UK office unless UK contact details are later expressly published.

---

# 14. OFFERS AND TRANSACTIONS

Where these features are enabled, we may process:

* offer amount;
* parties;
* Property;
* conditions;
* acceptance or rejection;
* milestones;
* due-diligence status;
* transaction records;
* commission information.

---

# 15. PAYMENT INFORMATION

Where payment functionality is enabled, we may process:

* customer;
* amount;
* currency;
* purpose;
* payment reference;
* payment status;
* refund information.

Payment providers such as **Paystack** may process card or bank information directly.

Enugu Properties does not intend to store complete card numbers or card security codes in its normal application database.

---

# 16. PROPERTY PURCHASE MONEY

Our ordinary payment system is intended for Enugu Properties Services, not general Property purchase funds.

We do not currently operate a general Property escrow service.

---

# 17. SUPPORT AND COMMUNICATIONS

We may process communications made through:

* contact forms;
* email;
* telephone;
* WhatsApp;
* support requests;
* Property enquiries;
* reports.

Relevant communications may be retained for support, fraud prevention, transaction administration and dispute resolution.

---

# 18. TECHNICAL INFORMATION

When you use the Platform, we may receive:

* IP address;
* browser;
* device;
* operating system;
* session identifiers;
* page requests;
* timestamps;
* security events;
* error information;
* approximate network location.

---

# 19. AUDIT LOGS

We may record important events including:

* registration;
* authentication;
* Property changes;
* moderation;
* document access;
* verification;
* payment events;
* inspection activity;
* staff actions.

These logs help establish accountability and protect users.

---

# 20. HOW WE RECEIVE INFORMATION

Information may come:

* directly from you;
* from an Owner or Agent;
* from organisations;
* from Professional Providers;
* from official sources;
* from another user making a report;
* automatically through use of the Platform.

---

# 21. PURPOSES OF PROCESSING

We process information for purposes such as:

* creating Accounts;
* authenticating users;
* publishing Property;
* moderation;
* verification;
* Property inspections;
* buyer enquiries;
* offers;
* transaction support;
* payments;
* customer support;
* fraud prevention;
* security;
* record keeping;
* legal compliance;
* Platform improvement.

---

# 22. LAWFUL BASES

Depending on the activity, we may rely on:

### Contract

Where processing is needed to provide an agreed Service.

### Steps Before Contract

Where you ask us to take steps before entering into an arrangement.

### Legal Obligation

Where processing is required by applicable law.

### Legitimate Interests

Including:

* fraud prevention;
* marketplace safety;
* moderation;
* cybersecurity;
* record keeping;
* protecting Buyers and Sellers.

### Consent

Where consent is appropriate, such as certain optional marketing or non-essential technologies.

Consent is not used artificially where another legal basis properly applies.

---

# 23. FRAUD PREVENTION

We may use information to identify possible:

* duplicate Properties;
* conflicting Sellers;
* repeated rejected Listings;
* unusual Account activity;
* payment abuse;
* suspicious document patterns.

A risk indicator does not automatically mean fraud occurred.

Where significant action is contemplated, appropriate human review should be used.

---

# 24. AUTOMATED SYSTEMS

Automated processes may assist with:

* bot detection;
* rate limiting;
* file validation;
* duplicate detection;
* queue prioritisation;
* technical security.

We do not intend to determine legal ownership of Property solely through an automated algorithm.

---

# 25. RECIPIENTS OF INFORMATION

Personal data may be shared where reasonably necessary with:

* Buyers;
* Sellers;
* authorised staff;
* inspectors;
* Professional Providers;
* payment processors;
* email providers;
* infrastructure providers;
* regulators;
* law enforcement where lawfully required.

We aim to share only information reasonably necessary for the purpose.

---

# 26. TECHNOLOGY PROVIDERS

We currently use or may use providers including:

### Cloudflare

For website infrastructure, security, bot protection and object storage.

### Neon

For database and related application infrastructure.

### Resend

For transactional email where enabled.

### Paystack

For online payment processing where enabled.

### Mapping providers

Where map functionality is enabled.

Provider usage may change as the Platform develops.

---

# 27. PUBLIC INFORMATION

Approved Listing information may become publicly visible, including:

* Property title;
* general location;
* asking price;
* description;
* Property features;
* photographs;
* public video where enabled;
* public verification status.

---

# 28. INFORMATION NOT PUBLIC BY DEFAULT

We do not ordinarily publish:

* government IDs;
* NIN;
* private title documents;
* private Seller address;
* internal risk flags;
* private verification evidence;
* moderator notes;
* payment information;
* hidden GPS coordinates.

---

# 29. PRIVATE FILE STORAGE

Confidential evidence is intended to use restricted storage and authorised access.

Controls may include:

* private object storage;
* authentication;
* role-based access;
* temporary signed links;
* access logging;
* quarantine;
* malware/security review.

---

# 30. FILE SECURITY

Uploaded files may be:

* validated;
* quarantined;
* scanned where the relevant system is available;
* manually reviewed;
* rejected.

A file should not be represented as security-cleared unless the applicable review has actually occurred.

---

# 31. SECURITY MEASURES

Measures may include:

* encryption in transit;
* restricted access;
* row-level database controls;
* private storage;
* temporary access links;
* audit logs;
* multi-factor authentication;
* rate limiting;
* bot protection;
* CSRF controls;
* backups;
* monitoring.

No system can guarantee absolute security.

---

# 32. STAFF ACCESS

Staff access should be based on legitimate role and need.

Having an administrator account does not necessarily entitle a person to view every sensitive record.

---

# 33. INTERNATIONAL PROCESSING

Some infrastructure providers may process information outside Nigeria.

Where required, we seek to use appropriate lawful safeguards for international processing.

A diaspora customer should expect that information submitted outside Nigeria may be processed by our team in Nigeria and by infrastructure providers operating internationally.

---

# 34. DATA RETENTION

We retain personal data only for as long as reasonably necessary, taking account of:

* Service provision;
* transaction records;
* fraud prevention;
* disputes;
* accounting;
* legal requirements;
* security.

Different categories may have different retention periods.

---

# 35. ACCOUNT CLOSURE

Closing an Account does not automatically require immediate deletion of every record.

Information may remain where legitimately needed for:

* completed transactions;
* financial records;
* disputes;
* fraud prevention;
* legal obligations.

---

# 36. PROPERTY HISTORY

Expired, sold, withdrawn or rejected Listings may be retained internally where reasonably necessary for:

* transaction history;
* Seller history;
* fraud prevention;
* dispute records;
* audit purposes.

---

# 37. PRIVATE DOCUMENT RETENTION

We aim not to retain sensitive Property or identity documents indefinitely without justification.

Retention decisions should take account of:

* active Property status;
* transaction status;
* verification;
* disputes;
* applicable law.

---

# 38. BACKUPS

Information may remain temporarily in protected backups following deletion until normal backup-retention periods expire.

---

# 39. YOUR RIGHTS

Subject to applicable law, you may have rights to:

* be informed;
* access personal data;
* correct inaccurate information;
* request erasure;
* request restriction;
* object to certain processing;
* obtain certain data in portable form;
* withdraw consent where consent is the applicable basis;
* seek appropriate review of significant automated decisions;
* complain to the competent regulator.

---

# 40. PRIVACY REQUESTS

Send privacy requests to:

**[support@enuguproperties.com](mailto:support@enuguproperties.com)**

Use the subject:

**Privacy Request**

where possible.

We may verify your identity before fulfilling sensitive requests.

---

# 41. ERASURE IS NOT ABSOLUTE

We may retain information where legitimately necessary for:

* legal obligations;
* accounting;
* fraud prevention;
* legal claims;
* transaction records;
* security.

Where appropriate, information may instead be anonymised or restricted.

---

# 42. MARKETING

Optional marketing communications may be unsubscribed from.

Necessary transactional or security communications may still be sent, including:

* password resets;
* Listing moderation;
* payment notifications;
* inspection updates;
* security alerts.

---

# 43. COOKIES

We may use cookies or similar technologies for:

* login;
* security;
* preferences;
* fraud prevention;
* Platform operation;
* analytics where enabled.

Non-essential technologies will be handled in accordance with applicable consent requirements.

---

# 44. TURNSTILE AND BOT PROTECTION

Where enabled, Cloudflare Turnstile or similar technology may process limited device/network information to protect forms and Accounts from automated abuse.

---

# 45. CHILDREN

The Platform is intended for adults.

Transactional users should normally be at least 18.

We do not knowingly design the Platform to collect children's data for Property transactions.

---

# 46. DATA BREACHES

We maintain procedures for investigating suspected personal-data breaches.

Where applicable law requires it, we will notify the Nigeria Data Protection Commission and/or affected individuals.

Nigeria's framework includes a 72-hour Commission notification obligation for breaches likely to create relevant risk to individuals.

---

# 47. THIRD-PARTY PROFESSIONALS

Independent solicitors, surveyors or other Professional Providers may act as separate data controllers for information they process in delivering their own professional services.

Their privacy terms may separately apply.

---

# 48. CHANGES TO THIS POLICY

We may update this Privacy Policy as:

* Services change;
* providers change;
* laws change;
* our operational model develops.

Material changes may be communicated through the Platform or by email.

---

# 49. COMPLAINTS

Privacy concerns should first be sent to:

**[support@enuguproperties.com](mailto:support@enuguproperties.com)**

You may also have the right to complain to the **Nigeria Data Protection Commission**.

---

# 50. CONTACT

**Enugu Properties**
Operated by **MAGENCY ONLINE SOLUTIONS LTD.**

RC Number: **8229228**

House 10
34V Terraces Estate
Road No. 2
Off Orchid Road
Lekki 106104
Lagos
Nigeria

**Privacy / Support:** [support@enuguproperties.com](mailto:support@enuguproperties.com)
**Diaspora:** [diaspora@enuguproperties.com](mailto:diaspora@enuguproperties.com)
**WhatsApp:** +234 903 366 0763

## END OF PRIVACY POLICY
$enugu_privacy_20260914$,'0a4215be210ef7740785b1e96d532156fc905f102cdea335b22088d9e27a5a41',true,true)
on conflict(kind,version) do update set legal_approved=true,active=true;

update public.agreement_versions set active=false where kind='seller' and active;
insert into public.agreement_versions(kind,version,content,sha256,legal_approved,active)
values('seller','2026-09-14',$enugu_seller_20260914$# SELLER TERMS & PROPERTY MARKETING MANDATE

**Effective date: 14 September 2026**

These Seller Terms & Property Marketing Mandate (“**Seller Agreement**”) govern Properties submitted, advertised or marketed through Enugu Properties.

**Enugu Properties** is operated by:

**MAGENCY ONLINE SOLUTIONS LTD.**
RC Number: **8229228**
Private Company Limited by Shares

House 10
34V Terraces Estate
Road No. 2
Off Orchid Road
Lekki 106104
Lagos
Nigeria

**Support:** [support@enuguproperties.com](mailto:support@enuguproperties.com)
**WhatsApp:** +234 903 366 0763

This Seller Agreement should be read with:

* Enugu Properties Terms of Use;
* Privacy Policy;
* applicable Listing Plan;
* the Property-specific Mandate Schedule accepted by the Seller.

---

# PART A — SELLER TERMS

## 1. PURPOSE

This Agreement establishes:

* Seller responsibilities;
* Property-submission requirements;
* moderation;
* verification;
* inspections;
* buyer introductions;
* advertising plans;
* Property-specific marketing appointments;
* Success Fee arrangements.

---

# 2. SELLER

“Seller” includes:

* Property Owner;
* authorised Agent;
* developer;
* company;
* lawful representative.

The Seller's actual capacity must be recorded truthfully.

---

# 3. SELLER AUTHORITY

By submitting a Property, the Seller confirms that they genuinely have authority to advertise it.

Where requested, the Seller must provide reasonable evidence.

---

# 4. AGENTS

An Agent must not submit Property simply because:

* the Agent saw another advertisement;
* obtained photographs;
* knows another Agent;
* heard that Property is available.

We may require direct Owner confirmation or other authority.

---

# 5. AUTHORITY DOES NOT EQUAL TITLE

Confirming authority to market does not itself prove:

* good legal title;
* ownership free from disputes;
* document authenticity;
* absence of encumbrances.

---

# 6. SELLER INFORMATION

The Seller must provide Property information accurately to the best of their knowledge.

This includes:

* location;
* asking price;
* dimensions;
* Property type;
* features;
* condition;
* title/document category;
* availability.

---

# 7. MATERIAL ISSUES

Where requested, the Seller must not knowingly conceal issues such as:

* ownership disputes;
* family disputes;
* litigation;
* competing sales;
* mortgages;
* charges;
* government acquisition;
* revocation;
* boundary disputes;
* probate issues;
* joint ownership;
* existing rights affecting sale.

---

# 8. DOCUMENTS

We may request documents including:

* C of O;
* Right of Occupancy;
* Deed of Assignment;
* Deed of Conveyance;
* Allocation Letter;
* Survey Plan;
* Power of Attorney;
* probate records;
* company records;
* authority to market.

Submission alone does not establish authenticity.

---

# 9. FALSE DOCUMENTS

The Seller must not knowingly submit:

* forged documents;
* manipulated evidence;
* false identity information;
* photographs of unrelated Property.

Serious concerns may result in immediate suspension.

---

# 10. PROPERTY MEDIA

The Seller must have appropriate rights to provide photographs, video and other media.

The Seller gives Enugu Properties permission to process and display that media for legitimate Property-marketing purposes.

---

# 11. ASKING PRICE

The asking price must be authorised by the Owner.

The Seller must promptly notify us of material price changes.

---

# 12. OFFERS

The Seller remains free to accept, reject or negotiate offers unless a separate legally binding agreement provides otherwise.

An offer displayed in the Platform does not itself transfer ownership.

---

# 13. LISTING PLANS

Listings may use:

* Free;
* Plus;
* Premium;
* other future plans.

Plans may differ in duration, media allowances and promotional visibility.

---

# 14. SERVICE AVAILABILITY

Some Platform features may be disabled during Enugu Properties' initial public launch.

A Seller is not entitled to a feature simply because it appears in an old screenshot, development plan or technical description.

The live plan description at the time of purchase or activation controls.

---

# 15. ADVERTISING AND VERIFICATION ARE SEPARATE

Buying Premium or Featured placement does not buy verification.

Verification must arise from the applicable evidence-based process.

---

# 16. MODERATION

Property cannot automatically become public merely because it is submitted or paid for.

Enugu Properties may:

* approve;
* reject;
* request changes;
* request documents;
* pause;
* remove

a Listing.

---

# 17. MATERIAL CHANGES

Material changes after approval may require renewed moderation.

This can include:

* Seller;
* Owner;
* location;
* dimensions;
* title information;
* survey information;
* material Property description.

Verification may also need to be repeated.

---

# 18. INSPECTIONS

Where inspection services are available, the Seller agrees to cooperate reasonably with properly arranged visits.

A standard inspection is not automatically a legal title investigation, structural survey or valuation.

---

# 19. BUYER ENQUIRIES

Enugu Properties may receive, qualify and manage buyer enquiries.

The Seller accepts that their direct contact details may not initially be displayed publicly.

---

# 20. COMPLIANCE

We may request additional information for:

* fraud prevention;
* identity verification;
* anti-money laundering obligations;
* legal compliance;
* transaction investigation.

---

# 21. WITHDRAWAL

The Seller may request withdrawal of the Property.

Withdrawal:

* stops or pauses public advertising;
* does not erase transaction history;
* does not automatically refund advertising already supplied;
* does not automatically extinguish obligations involving a genuine Introduced Buyer.

---

# PART B — PROPERTY MARKETING MANDATE

## 22. APPOINTMENT

By accepting a Property-specific Mandate Schedule, the Seller appoints:

**MAGENCY ONLINE SOLUTIONS LTD., operating Enugu Properties**

to provide the marketing and transaction-support activities identified in this Agreement.

---

# 23. DEFAULT MANDATE TYPE

Unless the Schedule expressly states otherwise, the Mandate is:

## NON-EXCLUSIVE

The Seller may therefore:

* market personally;
* use another Agent;
* use another property platform.

However, a Success Fee may remain payable where a qualifying transaction completes with an Introduced Buyer under this Agreement.

---

# 24. EXCLUSIVE MANDATES

An Exclusive Mandate applies only where:

* expressly displayed;
* specifically accepted;
* its commercial consequences are clearly disclosed.

A Seller must never be treated as accepting exclusivity through a hidden default.

---

# 25. OUR SERVICES UNDER THE MANDATE

Depending on the arrangement, Enugu Properties may:

* advertise Property;
* respond to enquiries;
* introduce prospective Buyers;
* arrange inspections;
* coordinate verification;
* record offers;
* coordinate searches;
* support communication;
* monitor transaction milestones.

---

# 26. NO AUTHORITY TO TRANSFER TITLE

Unless separately authorised by a valid instrument, Enugu Properties cannot:

* sign conveyancing documents for the Seller;
* transfer title;
* give possession;
* receive Property purchase consideration as Seller;
* make legal representations on Seller's behalf.

---

# 27. SUCCESS FEE

Where the Property Schedule contains a Success Fee, the Seller agrees to pay that fee when the qualifying conditions are met.

The initial standard commercial rate proposed by Enugu Properties is:

## 2% OF THE GROSS SALE PRICE

However:

### Only the fee actually displayed in and accepted through the Property-specific Schedule is binding.

A different transaction may therefore contain:

* another percentage;
* fixed amount;
* developer rate;
* negotiated arrangement.

There is no hidden commission.

---

# 28. GROSS SALE PRICE

Unless the Schedule states otherwise, Gross Sale Price means the genuine total consideration agreed for the Property itself.

It ordinarily excludes:

* government taxes;
* statutory registration charges;
* separately identified professional fees.

Artificial arrangements intended to disguise part of the genuine Property consideration may be treated according to their substance.

---

# 29. WHEN SUCCESS FEE IS EARNED

For a standard Non-Exclusive Mandate, the Success Fee is earned where:

1. Enugu Properties has a genuine contractual mandate from the Seller;

2. the Buyer qualifies as an Introduced Buyer;

3. Enugu Properties' introduction or marketing work was an effective part of the chain that resulted in the transaction; and

4. the sale completes.

This structure is intentional. Nigerian Supreme Court authority has emphasised that merely giving someone information about Property, without a proper agency basis or effective causal role, does not automatically create a commission entitlement.

---

# 30. PAYMENT DATE

Unless the Schedule states otherwise, an earned Success Fee becomes payable:

## within 3 Business Days after Completion.

---

# 31. NO FULL SUCCESS FEE FOR AN UNCOMPLETED OFFER

Unless expressly agreed otherwise:

* enquiry;
* inspection;
* offer;
* acceptance

does not itself trigger the standard completion-based Success Fee.

---

# 32. INTRODUCED BUYER

An “Introduced Buyer” means an identifiable Buyer who during the Mandate Period:

* makes a Property-specific enquiry through Enugu Properties;
* is specifically introduced to the Seller by Enugu Properties;
* attends an inspection arranged through Enugu Properties;
* submits an offer through Enugu Properties;
* receives non-public Property information as part of a genuine purchase enquiry;
* is otherwise specifically identified to the Seller as a prospective Buyer.

Anonymous website browsing alone does not make someone an Introduced Buyer.

---

# 33. INTRODUCTION RECORDS

We may maintain evidence including:

* enquiry reference;
* Buyer;
* Property;
* inspection;
* offer;
* date;
* communications.

These records may help resolve commission disputes.

---

# 34. PRE-EXISTING BUYERS

The Seller should declare genuine Buyers who were already in active discussions before the Mandate began.

These can be recorded as:

**Pre-Existing Prospects.**

A genuine Pre-Existing Prospect does not automatically become our Introduced Buyer merely by viewing the public Listing.

---

# 35. NOTICE OF PRE-EXISTING RELATIONSHIP

If we identify a Buyer whom the Seller says was already actively negotiating for the Property, the Seller should tell us promptly, preferably within:

## 5 Business Days.

Reasonable evidence may be requested.

---

# 36. DIRECT COMPLETION WITH INTRODUCED BUYER

Where Enugu Properties genuinely introduced the Buyer and the qualifying transaction later completes directly between the Seller and Buyer, the Success Fee may remain payable.

Changing the communication channel does not automatically erase a genuine introduction.

---

# 37. OTHER AGENT

Similarly, using another Agent to conclude negotiations does not necessarily extinguish the Success Fee if:

* Enugu Properties held the valid Seller mandate;
* we genuinely introduced the Buyer;
* our introduction remained an effective cause of the completed transaction.

---

# 38. ANTI-CIRCUMVENTION

The Seller must not deliberately attempt to avoid an agreed Success Fee by:

* moving an Introduced Buyer off-platform secretly;
* pretending the Buyer came from another source;
* using a nominee solely to conceal the Buyer's identity;
* postponing Completion purely to evade an applicable fee.

This clause applies only to genuine qualifying introductions.

---

# 39. INDEPENDENT BUYERS

For a Non-Exclusive Mandate, Enugu Properties does **not** claim commission merely because the Property sells.

If the Seller genuinely finds a Buyer independently and Enugu Properties did not introduce or materially cause that Buyer to purchase, the normal Enugu Properties Success Fee is not payable solely because the Listing existed.

---

# 40. TAIL PERIOD

Unless another period is displayed in the Schedule, the standard Tail Period is:

## 180 DAYS

after termination of the Mandate.

The Success Fee may remain payable during the Tail Period if:

* the Buyer was genuinely introduced during the Mandate Period; and
* the sale to that Buyer later completes.

---

# 41. PURPOSE OF TAIL PERIOD

The Tail Period protects genuine introductions from deliberate delay.

It does not create commission on Buyers we never introduced.

---

# 42. SELLER SALE NOTIFICATION

The Seller must notify Enugu Properties reasonably promptly when:

* an offer is accepted;
* the transaction reaches formal contract;
* the Property is sold;
* the Property is withdrawn;
* Completion occurs.

---

# 43. COMPLETION INFORMATION

Where commission applies, we may request reasonable evidence of:

* Completion;
* final sale price;
* completion date.

We should not demand information unrelated to establishing the fee.

---

# 44. INSTALMENT SALES

Where Property is sold by instalments, the parties may agree how the Success Fee is paid.

Unless expressly varied, commission calculation remains based on the agreed Gross Sale Price.

---

# 45. SELLER'S SOLICITOR

The Seller remains free to engage an independent solicitor.

Where authorised, the solicitor may confirm Completion details or settle an agreed fee from completion proceeds.

Such authority must not be assumed.

---

# 46. THIRD-PARTY PROFESSIONAL FEES

Costs for:

* solicitor;
* survey;
* valuation;
* official search;
* inspection;
* photography

may be separate from Enugu Properties' Success Fee.

Separate charges must be disclosed before commitment.

---

# 47. DUPLICATE AGENT CLAIMS

If another Agent claims the same Buyer introduction, the Seller should notify us.

Relevant evidence may include:

* dates;
* communications;
* inspection history;
* previous negotiations.

We will not knowingly claim commission merely because another Agent also makes a demand.

---

# 48. CONFLICTS

Enugu Properties should disclose a material conflict of interest that becomes known to us.

We must not secretly act for both sides on conflicting commission arrangements.

A Buyer may separately purchase a clearly disclosed service without automatically making Enugu Properties the Buyer's acquisition agent.

---

# 49. TERMINATION

Either party may terminate a Non-Exclusive Mandate using the Platform or written/electronic notice unless a specifically agreed term lawfully provides otherwise.

Termination does not affect:

* accrued advertising fees;
* qualifying transactions already completed;
* Tail Period;
* fraud claims;
* records reasonably required for legal or operational purposes.

---

# 50. LISTING EXPIRY

Expiry of an advertising plan does not automatically terminate a separate Marketing Mandate unless the Property Schedule states that both periods are the same.

---

# 51. CONFIDENTIALITY

We will take reasonable steps to protect private Seller and Property information.

The Seller authorises us to disclose information reasonably necessary to legitimate:

* Buyers;
* staff;
* inspectors;
* Professional Providers.

---

# 52. PERSONAL DATA

Seller information is processed under the Enugu Properties Privacy Policy.

---

# 53. FRAUD

We may pause or terminate activity where we reasonably suspect:

* forged documents;
* identity misuse;
* unauthorised sale;
* fraud;
* money laundering.

---

# 54. LIMITATION OF LIABILITY

Nothing in this Agreement excludes liability that applicable law does not permit us to exclude.

Subject to mandatory law, we do not guarantee:

* sale;
* Property value;
* buyer performance;
* transaction completion;
* uninterrupted Platform availability.

---

# 55. SELLER RESPONSIBILITY FOR DELIBERATE MISCONDUCT

To the extent permitted by law, a business Seller may be responsible for reasonable direct loss caused by the Seller's deliberate:

* fraud;
* forged documentation;
* unauthorised marketing;
* copyright infringement;
* circumvention of an agreed qualifying Success Fee.

This clause does not remove mandatory consumer protections.

---

# 56. COMMISSION DISPUTES

When a dispute arises, relevant evidence should include:

* accepted Mandate version;
* commission rate;
* Buyer identity;
* introduction history;
* transaction timeline;
* Completion;
* Tail Period.

The parties should first attempt good-faith resolution.

---

# 57. GOVERNING LAW

This Seller Agreement is governed by Nigerian law and relevant Property laws applicable where the Property is located.

Nothing in this Agreement itself transfers land.

---

# 58. ELECTRONIC ACCEPTANCE

The Mandate may be accepted electronically.

The system may preserve:

* Seller Account;
* Property;
* Agreement version;
* commission;
* Mandate type;
* timestamp;
* technical acceptance evidence where lawful.

---

# 59. HISTORICAL VERSION

The exact Mandate accepted by the Seller must be preserved.

Future changes must not silently rewrite an earlier accepted Property-specific commercial agreement.

---

# PART C — PROPERTY-SPECIFIC MANDATE SCHEDULE

## ENUGU PROPERTIES

**Brand:** Enugu Properties
**Operator:** MAGENCY ONLINE SOLUTIONS LTD.
**RC:** 8229228

---

## SELLER

**Seller Name:** [System populated]

**Seller Reference:** [System populated]

**Seller Type:**

[ ] Property Owner
[ ] Authorised Agent
[ ] Developer / Company
[ ] Joint / Family Representative
[ ] Other

**Organisation:** [If applicable]

---

## PROPERTY

**Property Reference:** [EP-YYYY-XXXXXX]

**Property:** [System populated]

**Location:** [System populated]

**Asking Price:** ₦[System populated]

---

## SELLER CAPACITY

[ ] I am the Owner.

[ ] I am authorised by the Owner.

[ ] I represent the company/developer.

[ ] Joint/family Property circumstances have been disclosed.

[ ] Other.

---

## MANDATE TYPE

Default:

### [✓] NON-EXCLUSIVE

Alternative only where specifically accepted:

### [ ] EXCLUSIVE

---

## MANDATE PERIOD

**Start:** [Date]

**End:** [Date]

or:

[ ] Continues until terminated under the Agreement.

---

## SUCCESS FEE

**Type:**

[ ] Percentage
[ ] Fixed Fee
[ ] Negotiated Arrangement

**Agreed Percentage:**

## [2.00]%

of Gross Sale Price

OR:

**Agreed Fixed Amount:** ₦[ ]

The Seller confirms that this fee was clearly displayed before acceptance.

---

## PAYMENT TRIGGER

Default:

> A qualifying Success Fee becomes payable when a transaction with a qualifying Introduced Buyer completes.

**Payment Due:** 3 Business Days following Completion unless varied below.

**Variation:** [If any]

---

## TAIL PERIOD

Default:

## 180 DAYS

Alternative agreed period:

[ ]

---

## PRE-EXISTING PROSPECTS

[ ] No Pre-Existing Prospects declared.

or:

**Prospect:** [ ]

**Evidence / Date of prior discussions:** [ ]

---

## ADVERTISING PLAN

[ ] Free
[ ] Plus
[ ] Premium
[ ] Other

**Price:** ₦[ ]

**Duration:** [ ]

Advertising fees are separate from Success Fee unless expressly stated otherwise.

---

## ADDITIONAL SERVICES

[ ] Physical Inspection
[ ] Photography
[ ] Video — where available
[ ] Document Review
[ ] Official Search Coordination
[ ] Survey Review Coordination
[ ] Legal Due Diligence Coordination
[ ] Diaspora Support
[ ] Other

Only Services currently enabled by Enugu Properties may be selected.

---

# SELLER DECLARATION

By accepting this Mandate, I confirm that:

1. I have read this Seller Agreement.

2. Information supplied by me is accurate to the best of my knowledge.

3. I am the Owner or genuinely authorised to market the Property.

4. Enugu Properties may request supporting evidence.

5. Advertising payment does not purchase verification.

6. Publication does not guarantee legal title.

7. I have seen the exact applicable Success Fee before accepting.

8. I understand the definition of Introduced Buyer.

9. I understand the Tail Period.

10. I will notify Enugu Properties if the Property sells or is withdrawn.

11. I agree to electronic acceptance and record keeping.

---

## ACCEPTANCE RECORD

**Seller:** [System]

**Property:** [System]

**Agreement Version:** [System]

**Mandate Type:** [System snapshot]

**Commission:** [System snapshot]

**Tail Period:** [System snapshot]

**Accepted At:** [Timestamp]

**Acceptance Method:** [System]

**Agreement Snapshot Reference:** [System]

## END OF SELLER TERMS & PROPERTY MARKETING MANDATE
$enugu_seller_20260914$,'8d3e1e0e15c807126884d0b55e9114f44fcb91fa99a2203f021e231492c66747',true,true)
on conflict(kind,version) do update set legal_approved=true,active=true;


-- Source: supabase/migrations/0012_registration_activation.sql
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
  where id=app_auth.uid();
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
  buyer_id=app_auth.uid()
  or exists(
    select 1 from public.properties p
    where p.id=property_id and p.seller_id=app_auth.uid()
  )
  or app_private.has_permission('support')
  or app_private.has_permission('transactions')
);

drop policy if exists inspections_read on public.inspections;
create policy inspections_read on public.inspections for select using(
  buyer_id=app_auth.uid()
  or exists(
    select 1 from public.properties p
    where p.id=property_id and p.seller_id=app_auth.uid()
  )
  or (inspector_id=app_auth.uid() and app_private.has_permission('inspect'))
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


-- Source: supabase/migrations/0013_staff_access.sql
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

create table public.staff_mfa_exemptions(
 user_id uuid primary key references public.profiles(id) on delete cascade,
 reason text not null,
 created_at timestamptz not null default now(),
 expires_at timestamptz
);

alter table public.staff_mfa_factors enable row level security;
alter table public.staff_mfa_sessions enable row level security;
alter table public.staff_mfa_exemptions enable row level security;
revoke all on public.staff_mfa_factors,public.staff_mfa_sessions,public.staff_mfa_exemptions from public,anon,authenticated;
grant all on public.staff_mfa_factors,public.staff_mfa_sessions,public.staff_mfa_exemptions to service_role;

create or replace function app_private.has_permission(p text) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(
   select 1
   from public.user_roles ur
   join public.role_permissions rp on rp.role_id=ur.role_id
   join public.profiles u on u.id=ur.user_id
   where ur.user_id=app_auth.uid()
     and u.status='active'
     and rp.permission_id=p
     and (
       coalesce(app_auth.jwt()->>'aal','')='aal2'
       or exists(
         select 1 from public.staff_mfa_sessions s
         where s.user_id=app_auth.uid() and s.expires_at>now()
       )
       or exists(
         select 1 from public.staff_mfa_exemptions e
         where e.user_id=app_auth.uid()
           and (e.expires_at is null or e.expires_at>now())
       )
     )
 );
$$;


-- Source: supabase/migrations/0014_listing_usability.sql
-- Simplify early-stage listing submission and make approved listing revisions manageable.

create or replace function app_private.normalise_seller_revision_status() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status in ('live','paused','under_offer')
   and new.status='under_review'
   and old.seller_id=app_auth.uid()
 then
  new.status:='needs_changes';
 end if;
 return new;
end; $$;

drop trigger if exists normalise_seller_revision_status on public.properties;
create trigger normalise_seller_revision_status
before update of status on public.properties
for each row execute function app_private.normalise_seller_revision_status();

create or replace function public.submit_property(p_id uuid,p_agreement uuid) returns void language plpgsql security definer set search_path='' as $$
declare p public.properties; plan public.listing_plans; a uuid; begin
 select * into p from public.properties where id=p_id for update;
 if not app_private.active_user() or p.seller_id is distinct from app_auth.uid() or p.status not in ('draft','needs_changes','payment_pending') then raise exception 'This listing cannot be submitted in its current status'; end if;
 select * into plan from public.listing_plans where id=p.plan_id and active;
 if plan.id is null then raise exception 'Select an available advertising plan'; end if;
 if length(trim(p.description))<50 then raise exception 'Describe the property using at least 50 characters'; end if;
 if not exists(select 1 from public.profiles where id=app_auth.uid() and length(trim(full_name))>1 and length(trim(phone))>5) then raise exception 'Complete your name and phone number in your profile before submitting'; end if;
 if not exists(select 1 from public.property_media where property_id=p.id and kind='image' and status='ready') then raise exception 'Upload at least one property photograph before submitting'; end if;
 if not exists(select 1 from public.agreement_versions where id=p_agreement and kind='seller' and active and legal_approved) then raise exception 'Approved seller terms are not yet available'; end if;
 if plan.price_minor>0 and not exists(select 1 from public.orders where property_id=p.id and plan_id=p.plan_id and status='paid' and plan_snapshot=p.plan_snapshot) then raise exception 'Complete the advertising payment before submitting'; end if;
 insert into public.agreement_acceptances(user_id,property_id,version_id) values(app_auth.uid(),p.id,p_agreement) on conflict(user_id,property_id,version_id) do nothing;
 select id into a from public.agreement_acceptances where user_id=app_auth.uid() and property_id=p.id and version_id=p_agreement;
 insert into public.marketing_mandates(seller_id,property_id,kind,basis_points,acceptance_id) values(app_auth.uid(),p.id,'percentage',coalesce((select (value->>'basis_points')::int from public.system_settings where key='commission'),200),a) on conflict(property_id) do nothing;
 update public.properties set status='submitted',plan_snapshot=coalesce(plan_snapshot,to_jsonb(plan)),updated_at=now() where id=p.id;
 perform app_private.audit('listing_submitted','property',p.id);
 perform app_private.notify(app_auth.uid(),'listing_submitted','Listing submitted',p.reference||' is awaiting review. Further changes require another review.');
end; $$;

create or replace function public.moderate_property(p_id uuid,p_decision text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare p public.properties; days int; begin
 if not app_private.has_permission('moderate') or length(trim(p_reason))<5 then raise exception 'Enter a moderation reason using at least 5 characters'; end if;
 select * into p from public.properties where id=p_id for update;
 if p.id is null then raise exception 'Listing not found'; end if;
 -- Staff may urgently pause their own public listing, but independent review is
 -- still required for every approval, rejection or amendment decision.
 if p.seller_id=app_auth.uid() and not (p.status in ('live','under_offer') and p_decision='paused') then raise exception 'Another staff member must review your own listing'; end if;
 if not ((p.status='submitted' and p_decision='under_review') or (p.status='under_review' and p_decision in ('live','needs_changes','rejected')) or (p.status in ('live','under_offer') and p_decision='paused')) then raise exception 'This moderation decision is not available for the listing’s current status'; end if;
 if p_decision='live' and p.plan_snapshot is null then raise exception 'The listing has no advertising plan snapshot'; end if;
 days:=coalesce((p.plan_snapshot->>'duration_days')::int,30);
 update public.properties set status=p_decision,published_at=case when p_decision='live' then coalesce(published_at,now()) else published_at end,expires_at=case when p_decision='live' then now()+make_interval(days=>days) else expires_at end,updated_at=now() where id=p.id;
 insert into public.moderation_reviews(property_id,actor_id,decision,reason) values(p.id,app_auth.uid(),p_decision,p_reason);
 perform app_private.audit('moderation_'||p_decision,'property',p.id,jsonb_build_object('reason',p_reason));
 perform app_private.notify(p.seller_id,'listing_update','Listing review updated',p.reference||': '||replace(p_decision,'_',' ')||'. '||p_reason);
end; $$;

create or replace function public.attach_upload(p_property uuid,p_owner uuid,p_path text,p_kind text,p_type text,p_name text,p_mime text,p_bytes bigint,p_hash text) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.properties; plan public.listing_plans; result uuid; begin
 select * into p from public.properties where id=p_property for update;
 if p.id is null or p.seller_id<>p_owner or p.status not in ('draft','needs_changes','live','paused','under_offer') then raise exception 'Photos can only be changed before submission or while preparing a new approved-listing revision'; end if;
 if not exists(select 1 from public.profiles where id=p_owner and status='active') then raise exception 'Your account must be active to upload files'; end if;
 select * into plan from public.listing_plans where id=p.plan_id;
 if p_kind='image' then
  if p_mime<>'image/webp' then raise exception 'Upload a JPEG, PNG or WebP photograph'; end if;
  if (select count(*) from public.property_media where property_id=p.id and kind='image')>=plan.photo_limit then raise exception 'Your % plan allows a maximum of % photographs. Delete a photograph or choose another plan.',plan.name,plan.photo_limit; end if;
  insert into public.property_media(property_id,storage_path,kind,mime,size_bytes,alt) values(p.id,p_path,p_kind,p_mime,p_bytes,left(p_name,160)) returning id into result;
 elsif p_kind='document' then
  if not exists(select 1 from public.document_types where id=p_type) then raise exception 'Choose a document category'; end if;
  if p_mime not in ('image/webp','application/pdf') then raise exception 'Upload a PDF, JPEG, PNG or WebP document'; end if;
  if (select count(*) from public.property_documents where property_id=p.id)>=30 then raise exception 'A listing can contain no more than 30 private documents'; end if;
  insert into public.property_documents(property_id,owner_id,type_id,storage_path,original_name,mime,sha256) values(p.id,p_owner,p_type,p_path,left(p_name,160),p_mime,p_hash) returning id into result;
  update public.property_verifications set status='expired' where property_id=p.id and status='completed';
 else raise exception 'Unsupported upload category'; end if;
 if p.status in ('live','paused','under_offer') then
  insert into public.property_revisions(property_id,actor_id,revision,snapshot) values(p.id,p_owner,p.revision,to_jsonb(p));
  update public.properties set status='needs_changes',revision=revision+1,updated_at=now() where id=p.id;
  update public.property_verifications set status='expired' where property_id=p.id and status='completed';
  perform app_private.audit('approved_listing_media_revision','property',p.id,jsonb_build_object('previous_revision',p.revision));
 end if;
 insert into public.audit_logs(actor_id,action,entity,entity_id) values(p_owner,'file_uploaded',p_kind,result);
 return result;
end; $$;

create or replace function public.delete_property_media(p_media uuid,p_owner uuid) returns table(bucket text,storage_path text) language plpgsql security definer set search_path='' as $$
declare p public.properties; m public.property_media; begin
 select media.* into m from public.property_media media where media.id=p_media for update;
 if m.id is null or m.kind<>'image' then raise exception 'Photograph not found'; end if;
 select * into p from public.properties where id=m.property_id for update;
 if p.seller_id<>p_owner then raise exception 'You can only remove photographs from your own listing'; end if;
 if p.status not in ('draft','needs_changes','live','paused','under_offer') then raise exception 'Photographs are locked while this listing is being reviewed'; end if;
 if p.status in ('live','paused','under_offer') then
  insert into public.property_revisions(property_id,actor_id,revision,snapshot) values(p.id,p_owner,p.revision,to_jsonb(p));
  update public.properties set status='needs_changes',revision=revision+1,updated_at=now() where id=p.id;
  update public.property_verifications set status='expired' where property_id=p.id and status='completed';
  perform app_private.audit('approved_listing_media_revision','property',p.id,jsonb_build_object('previous_revision',p.revision));
 end if;
 delete from public.property_media where id=m.id;
 perform app_private.audit('file_deleted','image',m.id,jsonb_build_object('property_id',p.id));
 bucket:='property-media'; storage_path:=m.storage_path; return next;
end; $$;

revoke all on function public.delete_property_media(uuid,uuid) from public,anon,authenticated;
grant execute on function public.delete_property_media(uuid,uuid) to service_role;

-- An approved listing becomes an editable amendment request. It must be
-- resubmitted and independently approved before it can become public again.
create or replace function public.begin_approved_listing_revision(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare p public.properties; begin
 select * into p from public.properties where id=p_id for update;
 if p.id is null or p.seller_id is distinct from app_auth.uid() then raise exception 'Listing not found'; end if;
 if p.status not in ('live','paused','under_offer') then raise exception 'Only an approved listing can start a new revision'; end if;
 insert into public.property_revisions(property_id,actor_id,revision,snapshot) values(p.id,app_auth.uid(),p.revision,to_jsonb(p));
 update public.properties set status='needs_changes',revision=revision+1,updated_at=now() where id=p.id;
 update public.property_verifications set status='expired' where property_id=p.id and status='completed';
 perform app_private.audit('approved_listing_revision_started','property',p.id,jsonb_build_object('previous_revision',p.revision));
end; $$;

revoke all on function public.begin_approved_listing_revision(uuid) from public,anon,authenticated;
grant execute on function public.begin_approved_listing_revision(uuid) to authenticated;


-- Source: supabase/migrations/0015_marketplace_listing_purposes.sql
-- Add sale, rental and short-let purposes across listing creation and public search.
alter table public.properties
  add column if not exists listing_purpose text not null default 'sale'
  check (listing_purpose in ('sale','rent','short-let'));

create index if not exists properties_listing_purpose_filters
  on public.properties(status, listing_purpose, category, location_id, price_minor);
create or replace function public.save_property(p_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare p public.properties; result uuid; loc uuid; safe_details jsonb; begin
 if not app_private.active_user() then raise exception 'Active account required'; end if;
 loc:=(p_data->>'location_id')::uuid;
 if not exists(select 1 from public.locations where id=loc and active and kind in ('area','estate','city')) then raise exception 'Choose an available area'; end if;
 if not (
   (p_data->>'category'='houses' and p_data->>'property_type' in ('detached-house','semi-detached-house','terraced-house','flat','bungalow')) or
   (p_data->>'category'='land' and p_data->>'property_type' in ('residential-land','commercial-land','mixed-use-land','agricultural-land')) or
   (p_data->>'category'='commercial' and p_data->>'property_type' in ('office','retail','warehouse','hospitality','industrial')) or
   (p_data->>'category'='new-developments' and p_data->>'property_type' in ('residential-development','mixed-use-development','commercial-development'))
 ) then raise exception 'Choose a property type that matches the category'; end if;
 if coalesce(p_data->>'listing_purpose','sale') not in ('sale','rent','short-let') then raise exception 'Choose whether the property is for sale, rent or short let'; end if;
 safe_details:=jsonb_strip_nulls(jsonb_build_object(
   'floors',nullif(p_data->'details'->>'floors','')::int,
   'year_built',nullif(p_data->'details'->>'year_built','')::int,
   'intended_use',nullif(p_data->'details'->>'intended_use',''),
   'topography',nullif(p_data->'details'->>'topography',''),
   'fenced',case when p_data->'details'->>'fenced' in ('true','false') then (p_data->'details'->>'fenced')::boolean end,
   'development_status',nullif(p_data->'details'->>'development_status',''),
   'road_access',nullif(p_data->'details'->>'road_access','')
 ));
 if (safe_details ? 'floors' and (safe_details->>'floors')::int not between 1 and 100)
   or (safe_details ? 'year_built' and (safe_details->>'year_built')::int not between 1900 and extract(year from now())::int + 10)
   or (safe_details ? 'intended_use' and safe_details->>'intended_use' not in ('residential','commercial','mixed-use','agricultural'))
   or (safe_details ? 'topography' and safe_details->>'topography' not in ('level','sloping','undulating'))
   or (safe_details ? 'development_status' and safe_details->>'development_status' not in ('undeveloped','partly-developed','serviced'))
   or (safe_details ? 'road_access' and safe_details->>'road_access' not in ('paved','unpaved','limited'))
 then raise exception 'Invalid property details'; end if;
 if p_id is null then
  insert into public.properties(seller_id,title,category,listing_purpose,property_type,location_id,description,price_minor,negotiable,bedrooms,bathrooms,toilets,living_rooms,parking_spaces,land_sqm,building_sqm,property_condition,furnishing,details,title_type,features)
  values(app_auth.uid(),p_data->>'title',p_data->>'category',coalesce(p_data->>'listing_purpose','sale'),p_data->>'property_type',loc,coalesce(p_data->>'description',''),(p_data->>'price_minor')::bigint,coalesce((p_data->>'negotiable')::boolean,false),nullif(p_data->>'bedrooms','')::int,nullif(p_data->>'bathrooms','')::int,nullif(p_data->>'toilets','')::int,nullif(p_data->>'living_rooms','')::int,nullif(p_data->>'parking_spaces','')::int,(p_data->>'land_sqm')::numeric,nullif(p_data->>'building_sqm','')::numeric,coalesce(p_data->>'property_condition',''),coalesce(p_data->>'furnishing',''),safe_details,coalesce(p_data->>'title_type',''),array(select jsonb_array_elements_text(coalesce(p_data->'features','[]')))) returning id into result;
  update public.properties set slug=trim(both '-' from regexp_replace(lower(title),'[^a-z0-9]+','-','g'))||'-'||lower(reference) where id=result;
  insert into public.property_private(property_id,address,ownership,latitude,longitude,survey_reference) values(result,coalesce(p_data->>'address',''),coalesce(p_data->>'ownership',''),nullif(p_data->>'latitude','')::numeric,nullif(p_data->>'longitude','')::numeric,coalesce(p_data->>'survey_reference',''));
 else
  select * into p from public.properties where id=p_id for update;
  if p.seller_id is distinct from app_auth.uid() or p.status not in ('draft','needs_changes','live','paused','under_offer','rejected','expired') then raise exception 'Listing cannot be edited'; end if;
  insert into public.property_revisions(property_id,actor_id,revision,snapshot) values(p.id,app_auth.uid(),p.revision,to_jsonb(p));
  if p.price_minor<>(p_data->>'price_minor')::bigint then insert into public.price_history(property_id,previous_minor,new_minor) values(p.id,p.price_minor,(p_data->>'price_minor')::bigint); end if;
  update public.properties set title=p_data->>'title',category=p_data->>'category',listing_purpose=coalesce(p_data->>'listing_purpose','sale'),property_type=p_data->>'property_type',location_id=loc,description=coalesce(p_data->>'description',''),price_minor=(p_data->>'price_minor')::bigint,negotiable=coalesce((p_data->>'negotiable')::boolean,false),bedrooms=nullif(p_data->>'bedrooms','')::int,bathrooms=nullif(p_data->>'bathrooms','')::int,toilets=nullif(p_data->>'toilets','')::int,living_rooms=nullif(p_data->>'living_rooms','')::int,parking_spaces=nullif(p_data->>'parking_spaces','')::int,land_sqm=(p_data->>'land_sqm')::numeric,building_sqm=nullif(p_data->>'building_sqm','')::numeric,property_condition=coalesce(p_data->>'property_condition',''),furnishing=coalesce(p_data->>'furnishing',''),details=safe_details,title_type=coalesce(p_data->>'title_type',''),features=array(select jsonb_array_elements_text(coalesce(p_data->'features','[]'))),
  status=case when p.status in ('live','under_offer','paused') then 'under_review' else 'draft' end,revision=revision+1,updated_at=now() where id=p.id;
  update public.property_private set address=coalesce(p_data->>'address',''),ownership=coalesce(p_data->>'ownership',''),latitude=nullif(p_data->>'latitude','')::numeric,longitude=nullif(p_data->>'longitude','')::numeric,survey_reference=coalesce(p_data->>'survey_reference','') where property_id=p.id;
  update public.property_verifications set status='expired' where property_id=p.id and status='completed';
  perform app_private.audit('material_revision','property',p.id,jsonb_build_object('previous_revision',p.revision)); result:=p.id;
 end if;
 if exists(select 1 from public.property_private a join public.property_private b on lower(a.address)=lower(b.address) and a.property_id<>b.property_id where a.property_id=result and length(a.address)>8) then
  insert into public.risk_flags(property_id,reason) values(result,'Potential address match — manual review required'); end if;
 return result;
end; $$;

drop view public.public_properties;
create view public.public_properties as
select p.id,p.reference,p.slug,p.title,p.description,p.category,l.name area,l.slug area_slug,p.price_minor,p.bedrooms,p.bathrooms,p.land_sqm,p.features,
 u.seller_type,case when p.status in ('live','under_offer') and p.expires_at<=now() then 'expired' else p.status end status,p.created_at,p.updated_at,
 exists(select 1 from public.promotions x where x.property_id=p.id and x.starts_at<=now() and x.ends_at>now()) featured,
 exists(select 1 from public.price_history h where h.property_id=p.id and h.new_minor<h.previous_minor and h.created_at>now()-interval '30 days') price_reduced,
 coalesce((select jsonb_agg('/api/media/'||m.id order by m.created_at) from public.property_media m where m.property_id=p.id and m.kind='image' and m.status='ready'),'[]') images,
 coalesce((select jsonb_agg(jsonb_build_object('type',v.type_id,'summary',v.public_summary,'completed_at',v.completed_at,'expires_at',v.expires_at)) from public.property_verifications v where v.property_id=p.id and v.status='completed' and v.property_revision=p.revision and (v.expires_at is null or v.expires_at>now())),'[]') checks,
 coalesce((select jsonb_agg('/api/media/'||m.id order by m.created_at) from public.property_media m where m.property_id=p.id and m.kind='video' and m.status='ready'),'[]') videos,
 p.property_type,p.negotiable,p.toilets,p.living_rooms,p.parking_spaces,p.building_sqm,p.property_condition,p.furnishing,p.details,p.listing_purpose
from public.properties p join public.locations l on l.id=p.location_id join public.profiles u on u.id=p.seller_id
where p.status in ('live','under_offer','sold','expired') and p.published_at is not null and u.status='active' and not p.is_demo;

grant select on public.public_properties to anon,anonymous,authenticated;

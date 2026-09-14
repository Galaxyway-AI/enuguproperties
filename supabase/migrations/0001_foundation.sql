-- All timestamps are UTC. Monetary values are integer NGN minor units.
create extension if not exists pgcrypto;
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id), full_name text not null default '', phone text not null default '',
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
begin insert into public.profiles(id,full_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),120)); return new; end; $$;
create trigger on_signup after insert on auth.users for each row execute function app_private.on_signup();

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
grant select on public.locations,public.listing_plans,public.verification_types,public.content_pages to anon;
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
grant select on public.public_properties to anon,authenticated;
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

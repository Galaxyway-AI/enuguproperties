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
 if not app_private.has_permission('compliance') or p_id=auth.uid() or length(p_reason)<10 then raise exception 'Compliance permission and reason required'; end if;
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

grant select on public.public_properties to anon,authenticated;

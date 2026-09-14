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
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('video-quarantine','video-quarantine',false,104857600,array['video/mp4']) on conflict do nothing;
update storage.buckets set file_size_limit=104857600 where id='property-media';
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

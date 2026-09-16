-- Simplify early-stage listing submission and make approved listing revisions manageable.

create or replace function app_private.normalise_seller_revision_status() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status in ('live','paused','under_offer')
   and new.status='under_review'
   and old.seller_id=auth.uid()
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
 if not app_private.active_user() or p.seller_id is distinct from auth.uid() or p.status not in ('draft','needs_changes','payment_pending') then raise exception 'This listing cannot be submitted in its current status'; end if;
 select * into plan from public.listing_plans where id=p.plan_id and active;
 if plan.id is null then raise exception 'Select an available advertising plan'; end if;
 if length(trim(p.description))<50 then raise exception 'Describe the property using at least 50 characters'; end if;
 if not exists(select 1 from public.profiles where id=auth.uid() and length(trim(full_name))>1 and length(trim(phone))>5) then raise exception 'Complete your name and phone number in your profile before submitting'; end if;
 if not exists(select 1 from public.property_media where property_id=p.id and kind='image' and status='ready') then raise exception 'Upload at least one property photograph before submitting'; end if;
 if not exists(select 1 from public.agreement_versions where id=p_agreement and kind='seller' and active and legal_approved) then raise exception 'Approved seller terms are not yet available'; end if;
 if plan.price_minor>0 and not exists(select 1 from public.orders where property_id=p.id and plan_id=p.plan_id and status='paid' and plan_snapshot=p.plan_snapshot) then raise exception 'Complete the advertising payment before submitting'; end if;
 insert into public.agreement_acceptances(user_id,property_id,version_id) values(auth.uid(),p.id,p_agreement) on conflict(user_id,property_id,version_id) do nothing;
 select id into a from public.agreement_acceptances where user_id=auth.uid() and property_id=p.id and version_id=p_agreement;
 insert into public.marketing_mandates(seller_id,property_id,kind,basis_points,acceptance_id) values(auth.uid(),p.id,'percentage',coalesce((select (value->>'basis_points')::int from public.system_settings where key='commission'),200),a) on conflict(property_id) do nothing;
 update public.properties set status='submitted',plan_snapshot=coalesce(plan_snapshot,to_jsonb(plan)),updated_at=now() where id=p.id;
 perform app_private.audit('listing_submitted','property',p.id);
 perform app_private.notify(auth.uid(),'listing_submitted','Listing submitted',p.reference||' is awaiting review. Further changes require another review.');
end; $$;

create or replace function public.moderate_property(p_id uuid,p_decision text,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare p public.properties; days int; begin
 if not app_private.has_permission('moderate') or length(trim(p_reason))<5 then raise exception 'Enter a moderation reason using at least 5 characters'; end if;
 select * into p from public.properties where id=p_id for update;
 if p.id is null then raise exception 'Listing not found'; end if;
 -- Staff may urgently pause their own public listing, but independent review is
 -- still required for every approval, rejection or amendment decision.
 if p.seller_id=auth.uid() and not (p.status in ('live','under_offer') and p_decision='paused') then raise exception 'Another staff member must review your own listing'; end if;
 if not ((p.status='submitted' and p_decision='under_review') or (p.status='under_review' and p_decision in ('live','needs_changes','rejected')) or (p.status in ('live','under_offer') and p_decision='paused')) then raise exception 'This moderation decision is not available for the listing’s current status'; end if;
 if p_decision='live' and p.plan_snapshot is null then raise exception 'The listing has no advertising plan snapshot'; end if;
 days:=coalesce((p.plan_snapshot->>'duration_days')::int,30);
 update public.properties set status=p_decision,published_at=case when p_decision='live' then coalesce(published_at,now()) else published_at end,expires_at=case when p_decision='live' then now()+make_interval(days=>days) else expires_at end,updated_at=now() where id=p.id;
 insert into public.moderation_reviews(property_id,actor_id,decision,reason) values(p.id,auth.uid(),p_decision,p_reason);
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
 if p.id is null or p.seller_id is distinct from auth.uid() then raise exception 'Listing not found'; end if;
 if p.status not in ('live','paused','under_offer') then raise exception 'Only an approved listing can start a new revision'; end if;
 insert into public.property_revisions(property_id,actor_id,revision,snapshot) values(p.id,auth.uid(),p.revision,to_jsonb(p));
 update public.properties set status='needs_changes',revision=revision+1,updated_at=now() where id=p.id;
 update public.property_verifications set status='expired' where property_id=p.id and status='completed';
 perform app_private.audit('approved_listing_revision_started','property',p.id,jsonb_build_object('previous_revision',p.revision));
end; $$;

revoke all on function public.begin_approved_listing_revision(uuid) from public,anon,authenticated;
grant execute on function public.begin_approved_listing_revision(uuid) to authenticated;

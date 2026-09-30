-- Let staff decide directly from a submitted advert. Only super admins may
-- moderate their own adverts; all decisions still leave a review and audit trail.
create or replace function public.moderate_property(p_id uuid,p_decision text,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare p public.properties; days int; reason_text text; own_listing boolean;
begin
 if not app_private.has_permission('moderate') then
  raise exception 'Moderation permission is required';
 end if;
 select * into p from public.properties where id=p_id for update;
 if p.id is null then raise exception 'Listing not found'; end if;
 own_listing := p.seller_id=auth.uid();
 if own_listing and p_decision<>'paused' and not exists(
  select 1 from public.user_roles
  where user_id=auth.uid() and role_id='super_admin'
 ) then
  raise exception 'Only a super admin may review their own listing';
 end if;
 if not (
  (p.status in ('submitted','under_review') and p_decision in ('live','needs_changes','rejected'))
  or (p.status='submitted' and p_decision='under_review')
  or (p.status in ('live','under_offer') and p_decision='paused')
 ) then
  raise exception 'This decision is not available for the listing’s current status';
 end if;
 if p_decision='live' and p.plan_snapshot is null then
  raise exception 'The listing has no advertising plan snapshot';
 end if;
 reason_text := nullif(trim(coalesce(p_reason,'')),'');
 if reason_text is null then
  reason_text := case p_decision
   when 'live' then 'Approved for publication.'
   when 'needs_changes' then 'Please update this listing and submit it again for review.'
   when 'rejected' then 'This listing was declined after review.'
   when 'paused' then 'This listing has been paused by the admin.'
   else 'Review started.'
  end;
 end if;
 if length(reason_text)<5 or length(reason_text)>2000 then
  raise exception 'The optional seller note must contain 5 to 2000 characters';
 end if;
 days:=coalesce((p.plan_snapshot->>'duration_days')::int,30);
 update public.properties set
  status=p_decision,
  published_at=case when p_decision='live' then coalesce(published_at,now()) else published_at end,
  expires_at=case when p_decision='live' then now()+make_interval(days=>days) else expires_at end,
  updated_at=now()
 where id=p.id;
 insert into public.moderation_reviews(property_id,actor_id,decision,reason)
 values(p.id,auth.uid(),p_decision,reason_text);
 perform app_private.audit('moderation_'||p_decision,'property',p.id,
  jsonb_build_object('reason',reason_text,'self_review',own_listing,'from_status',p.status));
 perform app_private.notify(p.seller_id,'listing_update','Listing review updated',
  p.reference||': '||replace(p_decision,'_',' ')||'. '||reason_text);
end; $$;

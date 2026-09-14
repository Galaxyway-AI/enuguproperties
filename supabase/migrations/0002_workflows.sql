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

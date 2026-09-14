-- Draft photographs remain private too. The public media route serves only live/inactive approved inventory.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('property-media','property-media',false,12582912,array['image/webp','video/mp4']),
 ('private-evidence','private-evidence',false,12582912,array['application/pdf','image/webp']) on conflict(id) do nothing;
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

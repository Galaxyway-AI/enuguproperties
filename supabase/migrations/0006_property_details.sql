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
  values(auth.uid(),p_data->>'title',p_data->>'category',p_data->>'property_type',loc,coalesce(p_data->>'description',''),(p_data->>'price_minor')::bigint,coalesce((p_data->>'negotiable')::boolean,false),nullif(p_data->>'bedrooms','')::int,nullif(p_data->>'bathrooms','')::int,nullif(p_data->>'toilets','')::int,nullif(p_data->>'living_rooms','')::int,nullif(p_data->>'parking_spaces','')::int,(p_data->>'land_sqm')::numeric,nullif(p_data->>'building_sqm','')::numeric,coalesce(p_data->>'property_condition',''),coalesce(p_data->>'furnishing',''),safe_details,coalesce(p_data->>'title_type',''),array(select jsonb_array_elements_text(coalesce(p_data->'features','[]')))) returning id into result;
  update public.properties set slug=trim(both '-' from regexp_replace(lower(title),'[^a-z0-9]+','-','g'))||'-'||lower(reference) where id=result;
  insert into public.property_private(property_id,address,ownership,latitude,longitude,survey_reference) values(result,coalesce(p_data->>'address',''),coalesce(p_data->>'ownership',''),nullif(p_data->>'latitude','')::numeric,nullif(p_data->>'longitude','')::numeric,coalesce(p_data->>'survey_reference',''));
 else
  select * into p from public.properties where id=p_id for update;
  if p.seller_id is distinct from auth.uid() or p.status not in ('draft','needs_changes','live','paused','under_offer','rejected','expired') then raise exception 'Listing cannot be edited'; end if;
  insert into public.property_revisions(property_id,actor_id,revision,snapshot) values(p.id,auth.uid(),p.revision,to_jsonb(p));
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

grant select on public.public_properties to anon,authenticated;

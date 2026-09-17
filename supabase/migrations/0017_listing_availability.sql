-- Let a lister mark an approved advert sold or rented without changing its
-- moderation lifecycle. Available is intentionally silent on public adverts.
alter table public.properties
  add column if not exists availability_status text not null default 'available'
  check (availability_status in ('available','sold','rented'));

create or replace function app_private.normalise_listing_availability()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.listing_purpose='sale' and new.availability_status='rented' then
    new.availability_status:='available';
  elsif new.listing_purpose in ('rent','short-let') and new.availability_status='sold' then
    new.availability_status:='available';
  end if;
  return new;
end; $$;

drop trigger if exists properties_normalise_listing_availability on public.properties;
create trigger properties_normalise_listing_availability
before insert or update of listing_purpose on public.properties
for each row execute function app_private.normalise_listing_availability();

create or replace function public.set_listing_availability(p_id uuid,p_availability text)
returns void language plpgsql security definer set search_path='' as $$
declare p public.properties;
begin
  if not app_private.active_user() then raise exception 'Active account required'; end if;
  if p_availability not in ('available','sold','rented') then
    raise exception 'Choose Available, Sold or Rented.';
  end if;

  select * into p from public.properties where id=p_id for update;
  if p.id is null or p.seller_id is distinct from auth.uid() then
    raise exception 'Listing not found.';
  end if;
  if p.published_at is null then
    raise exception 'This option becomes available after the advert is approved.';
  end if;
  if p.status in ('archived','withdrawn','rejected') then
    raise exception 'This advert is closed and its availability cannot be changed.';
  end if;
  if p.listing_purpose='sale' and p_availability='rented' then
    raise exception 'A property for sale can be marked Available or Sold.';
  end if;
  if p.listing_purpose in ('rent','short-let') and p_availability='sold' then
    raise exception 'A rental advert can be marked Available or Rented.';
  end if;

  update public.properties
  set availability_status=p_availability,updated_at=now()
  where id=p.id;
  perform app_private.audit(
    'listing_availability','property',p.id,
    jsonb_build_object('availability_status',p_availability)
  );
end; $$;

revoke all on function public.set_listing_availability(uuid,text) from public,anon,authenticated;
grant execute on function public.set_listing_availability(uuid,text) to authenticated;

drop view public.public_properties;
create view public.public_properties as
select p.id,p.reference,p.slug,p.title,p.description,p.category,l.name area,l.slug area_slug,p.price_minor,p.bedrooms,p.bathrooms,p.land_sqm,p.features,
 u.seller_type,case when p.status in ('live','under_offer') and p.expires_at<=now() then 'expired' else p.status end status,p.availability_status,p.created_at,p.updated_at,
 exists(select 1 from public.promotions x where x.property_id=p.id and x.starts_at<=now() and x.ends_at>now()) featured,
 exists(select 1 from public.price_history h where h.property_id=p.id and h.new_minor<h.previous_minor and h.created_at>now()-interval '30 days') price_reduced,
 coalesce((select jsonb_agg('/api/media/'||m.id order by m.created_at) from public.property_media m where m.property_id=p.id and m.kind='image' and m.status='ready'),'[]') images,
 coalesce((select jsonb_agg(jsonb_build_object('type',v.type_id,'summary',v.public_summary,'completed_at',v.completed_at,'expires_at',v.expires_at)) from public.property_verifications v where v.property_id=p.id and v.status='completed' and v.property_revision=p.revision and (v.expires_at is null or v.expires_at>now())),'[]') checks,
 coalesce((select jsonb_agg('/api/media/'||m.id order by m.created_at) from public.property_media m where m.property_id=p.id and m.kind='video' and m.status='ready'),'[]') videos,
 p.property_type,p.negotiable,p.toilets,p.living_rooms,p.parking_spaces,p.building_sqm,p.property_condition,p.furnishing,p.details,p.listing_purpose
from public.properties p join public.locations l on l.id=p.location_id join public.profiles u on u.id=p.seller_id
where p.status in ('live','under_offer','sold','expired') and p.published_at is not null and u.status='active' and not p.is_demo;

grant select on public.public_properties to anon,anonymous,authenticated;

-- A new advert needs only its essential details. Land size can be added later.
alter table public.properties alter column land_sqm drop not null;

-- Give an account's first advert the Plus plan when the automatic first-listing
-- offer is available. Checkout still records the free promotion before review.
create or replace function app_private.default_first_listing_plus()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.plan_id = 'free'
    and not exists (select 1 from public.properties p where p.seller_id = new.seller_id)
    and exists (select 1 from public.listing_plans where id = 'plus' and active)
    and exists (
      select 1 from public.discount_promotions
      where code = 'FIRSTPLUS' and active and automatic
        and starts_at <= now() and (ends_at is null or ends_at > now())
    ) then
    new.plan_id := 'plus';
  end if;
  return new;
end; $$;

drop trigger if exists default_first_listing_plus on public.properties;
create trigger default_first_listing_plus before insert on public.properties
for each row execute function app_private.default_first_listing_plus();

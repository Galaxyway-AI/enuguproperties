-- Seven-day featured homepage placements and fair homepage rotation.
alter table public.properties
  add column if not exists included_featured_redeemed_at timestamptz;

alter table public.promotions
  add column if not exists order_id uuid references public.orders;
create unique index if not exists promotions_order_unique
  on public.promotions(order_id) where order_id is not null;

alter table public.orders drop constraint if exists orders_purpose_check;
alter table public.orders
  add constraint orders_purpose_check check(purpose in ('listing','featured'));
drop index if exists public.one_pending_order;
create unique index one_pending_order_purpose
  on public.orders(property_id,purpose) where status='pending';

create or replace function app_private.activate_featured_placement(p_property uuid)
returns void language plpgsql security definer set search_path='' as $$
declare p public.properties; included_days int:=0; base_time timestamptz; o public.orders;
begin
  select * into p from public.properties where id=p_property for update;
  if p.id is null or p.status not in ('live','under_offer') or p.published_at is null then return; end if;

  select coalesce(max(ends_at),now()) into base_time
  from public.promotions where property_id=p.id and ends_at>now();
  base_time:=greatest(base_time,now());

  included_days:=coalesce((p.plan_snapshot->>'featured_days')::int,0);
  if included_days>0 and p.included_featured_redeemed_at is null then
    insert into public.promotions(property_id,starts_at,ends_at,source)
    values(p.id,base_time,base_time+make_interval(days=>included_days),'paid');
    base_time:=base_time+make_interval(days=>included_days);
    update public.properties set included_featured_redeemed_at=now() where id=p.id;
    perform app_private.audit('included_featured_activated','property',p.id,jsonb_build_object('days',included_days));
    perform app_private.notify(p.seller_id,'featured_activated','Included featured week activated',p.reference||' now has featured homepage placement until '||to_char(base_time at time zone 'Africa/Lagos','DD Mon YYYY HH24:MI')||' WAT.');
  end if;

  for o in
    select x.* from public.orders x
    where x.property_id=p.id and x.purpose='featured' and x.status='paid'
      and not exists(select 1 from public.promotions pr where pr.order_id=x.id)
    order by x.paid_at,x.created_at
  loop
    insert into public.promotions(property_id,starts_at,ends_at,source,order_id)
    values(p.id,base_time,base_time+interval '7 days','paid',o.id);
    base_time:=base_time+interval '7 days';
    perform app_private.audit('featured_placement_activated','order',o.id,jsonb_build_object('ends_at',base_time));
    perform app_private.notify(p.seller_id,'featured_activated','Featured advert activated',p.reference||' has featured homepage placement until '||to_char(base_time at time zone 'Africa/Lagos','DD Mon YYYY HH24:MI')||' WAT.');
  end loop;
end; $$;

create or replace function app_private.activate_featured_on_publish()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status in ('live','under_offer') and new.published_at is not null and
     (old.status is distinct from new.status or old.published_at is distinct from new.published_at) then
    perform app_private.activate_featured_placement(new.id);
  end if;
  return new;
end; $$;
drop trigger if exists properties_activate_featured on public.properties;
create trigger properties_activate_featured
after update of status,published_at on public.properties
for each row execute function app_private.activate_featured_on_publish();

create or replace function public.create_featured_order(p_property uuid)
returns public.orders language plpgsql security definer set search_path='' as $$
declare p public.properties; plan public.listing_plans; o public.orders;
begin
  select * into p from public.properties where id=p_property for update;
  if not app_private.active_user() or p.id is null or p.seller_id is distinct from auth.uid() then
    raise exception 'Listing not found.';
  end if;
  if p.status in ('rejected','withdrawn','sold','expired','archived') then
    raise exception 'Featured placement is not available for a closed advert.';
  end if;
  select * into plan from public.listing_plans where id=p.plan_id;
  if plan.id is null then raise exception 'Choose an advertising plan first.'; end if;

  select * into o from public.orders
  where property_id=p.id and purpose='featured' and status='pending'
  order by created_at desc limit 1;
  if o.id is not null then return o; end if;

  insert into public.orders(
    user_id,property_id,plan_id,plan_snapshot,original_amount_minor,
    discount_minor,amount_minor,purpose,status
  ) values(
    auth.uid(),p.id,plan.id,
    jsonb_build_object('product','featured_homepage','duration_days',7,'price_minor',500000,'plan_id',plan.id),
    500000,0,500000,'featured','pending'
  ) returning * into o;
  perform app_private.audit('featured_checkout_created','order',o.id,jsonb_build_object('property_id',p.id,'days',7));
  return o;
end; $$;

create or replace function public.featured_status(p_property uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.properties; active_until timestamptz; scheduled_until timestamptz; pending_count int:=0; paid_waiting int:=0;
begin
  select * into p from public.properties where id=p_property;
  if not app_private.active_user() or p.id is null or p.seller_id is distinct from auth.uid() then
    raise exception 'Listing not found.';
  end if;
  select max(ends_at) filter(where starts_at<=now() and ends_at>now()),max(ends_at) filter(where ends_at>now())
  into active_until,scheduled_until from public.promotions where property_id=p.id;
  select count(*) into pending_count from public.orders where property_id=p.id and purpose='featured' and status='pending';
  select count(*) into paid_waiting from public.orders o where o.property_id=p.id and o.purpose='featured' and o.status='paid'
    and not exists(select 1 from public.promotions pr where pr.order_id=o.id);
  return jsonb_build_object(
    'active',active_until is not null,
    'active_until',active_until,
    'scheduled_until',scheduled_until,
    'pending_checkout',pending_count>0,
    'paid_waiting_for_approval',paid_waiting>0,
    'included_days',coalesce((p.plan_snapshot->>'featured_days')::int,(select featured_days from public.listing_plans where id=p.plan_id),0),
    'included_redeemed',p.included_featured_redeemed_at is not null,
    'price_minor',500000,
    'duration_days',7
  );
end; $$;

create or replace function public.fulfil_payment(p_reference text,p_provider text,p_amount bigint,p_currency text)
returns void language plpgsql security definer set search_path='' as $$
declare o public.orders;
begin
  select * into o from public.orders where reference=p_reference for update;
  if o.id is null or o.amount_minor<>p_amount or o.currency<>p_currency then raise exception 'Payment mismatch'; end if;
  if o.status='paid' and o.provider_id=p_provider then return; end if;
  if o.status<>'pending' then raise exception 'Order not pending'; end if;
  update public.orders set status='paid',paid_at=now(),provider_id=p_provider where id=o.id;
  if o.purpose='listing' then
    update public.promotion_redemptions set status='redeemed',redeemed_at=now() where order_id=o.id and status='reserved';
    update public.properties set status='draft' where id=o.property_id and status='payment_pending';
    perform app_private.notify(o.user_id,'payment_receipt','Advertising payment received','Payment reference: '||o.reference||'. Submit your listing for moderation when ready.');
  else
    perform app_private.activate_featured_placement(o.property_id);
    perform app_private.notify(o.user_id,'payment_receipt','Featured advertising payment received','Payment reference: '||o.reference||'. The seven-day placement starts when the advert is live, or follows any current featured period.');
  end if;
  perform app_private.audit('payment_paid','order',o.id,jsonb_build_object('purpose',o.purpose));
end; $$;

create or replace function public.homepage_properties(p_limit int default 6)
returns setof public.public_properties language sql volatile security definer set search_path='' as $$
  select pp.*
  from public.public_properties pp
  join public.properties p on p.id=pp.id
  left join public.listing_plans lp on lp.id=p.plan_id
  where pp.status in ('live','under_offer')
  order by
    pp.featured desc,
    case when pp.featured then random() else 0 end,
    (coalesce((p.plan_snapshot->>'price_minor')::bigint,lp.price_minor,0)>0) desc,
    coalesce((p.plan_snapshot->>'visibility_weight')::int,lp.visibility_weight,0) desc,
    pp.created_at desc
  limit least(greatest(coalesce(p_limit,6),1),24);
$$;

revoke all on function public.create_featured_order(uuid),public.featured_status(uuid) from public,anon,authenticated;
grant execute on function public.create_featured_order(uuid),public.featured_status(uuid) to authenticated;
revoke all on function public.homepage_properties(int) from public;
grant execute on function public.homepage_properties(int) to anon,anonymous,authenticated;
revoke all on function app_private.activate_featured_placement(uuid) from public,anon,anonymous,authenticated;
grant execute on function app_private.activate_featured_placement(uuid) to service_role;

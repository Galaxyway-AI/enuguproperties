-- Controlled advertising promotions, including an automatic first Plus advert.
create table public.discount_promotions(
  id uuid primary key default gen_random_uuid(),
  code text unique not null check(code ~ '^[A-Z0-9][A-Z0-9_-]{2,29}$'),
  name text not null check(length(name) between 3 and 120),
  discount_kind text not null check(discount_kind in ('percent','fixed','free')),
  discount_value bigint not null default 0,
  plan_id text references public.listing_plans,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  max_redemptions int check(max_redemptions is null or max_redemptions>0),
  per_user_limit int not null default 1 check(per_user_limit between 1 and 100),
  first_listing_only boolean not null default false,
  automatic boolean not null default false,
  restricted_user_id uuid references public.profiles,
  active boolean not null default true,
  created_by uuid references public.profiles,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(ends_at is null or ends_at>starts_at),
  check(
    (discount_kind='percent' and discount_value between 1 and 10000) or
    (discount_kind='fixed' and discount_value>0) or
    (discount_kind='free' and discount_value=0)
  )
);

alter table public.orders drop constraint if exists orders_amount_minor_check;
alter table public.orders
  add constraint orders_amount_minor_check check(amount_minor>=0),
  add column if not exists original_amount_minor bigint,
  add column if not exists discount_minor bigint not null default 0,
  add column if not exists promotion_id uuid references public.discount_promotions;
update public.orders set original_amount_minor=amount_minor where original_amount_minor is null;
alter table public.orders alter column original_amount_minor set not null;
alter table public.orders
  add constraint orders_discount_amounts_check check(
    original_amount_minor>=0 and discount_minor>=0 and
    discount_minor<=original_amount_minor and
    amount_minor=original_amount_minor-discount_minor
  );

create table public.promotion_redemptions(
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.discount_promotions,
  order_id uuid unique not null references public.orders,
  user_id uuid not null references public.profiles,
  property_id uuid not null references public.properties,
  code text not null,
  original_amount_minor bigint not null check(original_amount_minor>=0),
  discount_minor bigint not null check(discount_minor>=0),
  final_amount_minor bigint not null check(final_amount_minor>=0),
  status text not null check(status in ('reserved','redeemed','cancelled','refunded')),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  check(final_amount_minor=original_amount_minor-discount_minor)
);
create index promotion_redemptions_campaign on public.promotion_redemptions(promotion_id,status,created_at);
create index promotion_redemptions_user on public.promotion_redemptions(user_id,promotion_id,status);

alter table public.discount_promotions enable row level security;
alter table public.promotion_redemptions enable row level security;
revoke all on public.discount_promotions,public.promotion_redemptions from anon,authenticated;
grant select on public.discount_promotions,public.promotion_redemptions to authenticated;
create policy promotions_staff_read on public.discount_promotions for select using(
  app_private.has_permission('settings') or app_private.has_permission('finance')
);
create policy promotion_redemptions_staff_read on public.promotion_redemptions for select using(
  app_private.has_permission('settings') or app_private.has_permission('finance')
);

create or replace function app_private.promotion_discount(p_kind text,p_value bigint,p_amount bigint)
returns bigint language sql immutable set search_path='' as $$
  select case p_kind
    when 'free' then p_amount
    when 'percent' then least(p_amount,round(p_amount::numeric*p_value/10000)::bigint)
    when 'fixed' then least(p_amount,p_value)
    else 0
  end;
$$;

create or replace function public.quote_listing_promotion(p_property uuid,p_code text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.properties; plan public.listing_plans; promo public.discount_promotions; discount bigint:=0; normalized text;
begin
  select * into p from public.properties where id=p_property;
  if not app_private.active_user() or p.seller_id is distinct from auth.uid() then
    raise exception 'Listing not found.';
  end if;
  select * into plan from public.listing_plans where id=p.plan_id and active;
  if plan.id is null or plan.price_minor<=0 then
    return jsonb_build_object('original_amount_minor',coalesce(plan.price_minor,0),'discount_minor',0,'final_amount_minor',coalesce(plan.price_minor,0));
  end if;
  normalized:=nullif(upper(trim(coalesce(p_code,''))), '');
  if normalized is not null then
    select * into promo from public.discount_promotions where code=normalized;
    if promo.id is null then raise exception 'Promotion code was not found.'; end if;
  else
    select * into promo from public.discount_promotions x
    where x.automatic and x.active and x.starts_at<=now() and (x.ends_at is null or x.ends_at>now())
      and (x.plan_id is null or x.plan_id=plan.id)
      and (x.restricted_user_id is null or x.restricted_user_id=auth.uid())
      and (not x.first_listing_only or not exists(select 1 from public.properties q where q.seller_id=auth.uid() and q.id<>p.id))
      and (x.max_redemptions is null or (select count(*) from public.promotion_redemptions r where r.promotion_id=x.id and r.status in ('reserved','redeemed'))<x.max_redemptions)
      and (select count(*) from public.promotion_redemptions r where r.promotion_id=x.id and r.user_id=auth.uid() and r.status in ('reserved','redeemed'))<x.per_user_limit
    order by app_private.promotion_discount(x.discount_kind,x.discount_value,plan.price_minor) desc,x.created_at
    limit 1;
  end if;
  if promo.id is not null then
    if not promo.active or promo.starts_at>now() or (promo.ends_at is not null and promo.ends_at<=now()) then raise exception 'Promotion code is inactive or expired.'; end if;
    if promo.plan_id is not null and promo.plan_id<>plan.id then raise exception 'Promotion code is not valid for this advertising plan.'; end if;
    if promo.restricted_user_id is not null and promo.restricted_user_id<>auth.uid() then raise exception 'Promotion code is assigned to another account.'; end if;
    if promo.first_listing_only and exists(select 1 from public.properties q where q.seller_id=auth.uid() and q.id<>p.id) then raise exception 'Promotion code is only valid for your first property advert.'; end if;
    if promo.max_redemptions is not null and (select count(*) from public.promotion_redemptions r where r.promotion_id=promo.id and r.status in ('reserved','redeemed'))>=promo.max_redemptions then raise exception 'This promotion has reached its redemption limit.'; end if;
    if (select count(*) from public.promotion_redemptions r where r.promotion_id=promo.id and r.user_id=auth.uid() and r.status in ('reserved','redeemed'))>=promo.per_user_limit then raise exception 'You have already used this promotion.'; end if;
    discount:=app_private.promotion_discount(promo.discount_kind,promo.discount_value,plan.price_minor);
  end if;
  return jsonb_build_object(
    'promotion_id',promo.id,'code',promo.code,'name',promo.name,
    'original_amount_minor',plan.price_minor,'discount_minor',discount,
    'final_amount_minor',plan.price_minor-discount
  );
end; $$;

drop function if exists public.create_order(uuid);
create or replace function public.create_order(p_property uuid,p_code text)
returns public.orders language plpgsql security definer set search_path='' as $$
declare p public.properties; plan public.listing_plans; promo public.discount_promotions; o public.orders; discount bigint:=0; final_amount bigint; normalized text; total_uses int:=0; user_uses int:=0;
begin
  select * into p from public.properties where id=p_property for update;
  if not app_private.active_user() or p.seller_id is distinct from auth.uid() or p.status not in ('draft','payment_pending','needs_changes') then raise exception 'Checkout not available'; end if;
  select * into plan from public.listing_plans where id=p.plan_id and active;
  if plan.id is null or plan.price_minor<=0 then raise exception 'Choose a paid advertising plan'; end if;

  normalized:=nullif(upper(trim(coalesce(p_code,''))), '');
  if normalized is not null then
    select * into promo from public.discount_promotions where code=normalized for update;
    if promo.id is null then raise exception 'Promotion code was not found.'; end if;
  else
    select * into promo from public.discount_promotions x
    where x.automatic and x.active and x.starts_at<=now() and (x.ends_at is null or x.ends_at>now())
      and (x.plan_id is null or x.plan_id=plan.id)
      and (x.restricted_user_id is null or x.restricted_user_id=auth.uid())
      and (not x.first_listing_only or not exists(select 1 from public.properties q where q.seller_id=auth.uid() and q.id<>p.id))
    order by app_private.promotion_discount(x.discount_kind,x.discount_value,plan.price_minor) desc,x.created_at
    limit 1 for update;
  end if;
  select * into o from public.orders
  where property_id=p.id and plan_id=plan.id and plan_snapshot=to_jsonb(plan)
    and promotion_id is not distinct from promo.id and status in ('pending','paid')
  order by case when status='paid' then 0 else 1 end,created_at desc limit 1;
  if o.id is not null then return o; end if;
  update public.promotion_redemptions set status='cancelled'
  where order_id in (select id from public.orders where property_id=p.id and status='pending') and status='reserved';
  update public.orders set status='failed' where property_id=p.id and status='pending';
  if promo.id is not null then
    select count(*) into total_uses from public.promotion_redemptions r where r.promotion_id=promo.id and r.status in ('reserved','redeemed');
    select count(*) into user_uses from public.promotion_redemptions r where r.promotion_id=promo.id and r.user_id=auth.uid() and r.status in ('reserved','redeemed');
    if not promo.active or promo.starts_at>now() or (promo.ends_at is not null and promo.ends_at<=now()) then raise exception 'Promotion code is inactive or expired.'; end if;
    if promo.plan_id is not null and promo.plan_id<>plan.id then raise exception 'Promotion code is not valid for this advertising plan.'; end if;
    if promo.restricted_user_id is not null and promo.restricted_user_id<>auth.uid() then raise exception 'Promotion code is assigned to another account.'; end if;
    if promo.first_listing_only and exists(select 1 from public.properties q where q.seller_id=auth.uid() and q.id<>p.id) then raise exception 'Promotion code is only valid for your first property advert.'; end if;
    if promo.max_redemptions is not null and total_uses>=promo.max_redemptions then raise exception 'This promotion has reached its redemption limit.'; end if;
    if user_uses>=promo.per_user_limit then raise exception 'You have already used this promotion.'; end if;
    discount:=app_private.promotion_discount(promo.discount_kind,promo.discount_value,plan.price_minor);
  end if;
  final_amount:=plan.price_minor-discount;
  update public.properties set status=case when final_amount=0 then 'draft' else 'payment_pending' end,plan_snapshot=to_jsonb(plan) where id=p.id;
  insert into public.orders(user_id,property_id,plan_id,plan_snapshot,original_amount_minor,discount_minor,amount_minor,promotion_id,status,paid_at)
  values(auth.uid(),p.id,plan.id,to_jsonb(plan),plan.price_minor,discount,final_amount,promo.id,case when final_amount=0 then 'paid' else 'pending' end,case when final_amount=0 then now() end)
  returning * into o;
  if promo.id is not null then
    insert into public.promotion_redemptions(promotion_id,order_id,user_id,property_id,code,original_amount_minor,discount_minor,final_amount_minor,status,redeemed_at)
    values(promo.id,o.id,auth.uid(),p.id,promo.code,plan.price_minor,discount,final_amount,case when final_amount=0 then 'redeemed' else 'reserved' end,case when final_amount=0 then now() end);
  end if;
  if final_amount=0 then
    perform app_private.notify(auth.uid(),'promotion_applied','Free advertising offer applied',promo.name||' has been applied to '||p.reference||'. Submit your listing for moderation when ready.');
    perform app_private.audit('promotion_redeemed','order',o.id,jsonb_build_object('promotion_id',promo.id,'discount_minor',discount));
  else
    perform app_private.audit('checkout_created','order',o.id,jsonb_build_object('promotion_id',promo.id,'discount_minor',discount));
  end if;
  return o;
end; $$;

create function public.create_order(p_property uuid)
returns public.orders language sql security definer set search_path='' as $$
  select * from public.create_order(p_property,null);
$$;

create or replace function public.fulfil_payment(p_reference text,p_provider text,p_amount bigint,p_currency text)
returns void language plpgsql security definer set search_path='' as $$
declare o public.orders;
begin
  select * into o from public.orders where reference=p_reference for update;
  if o.id is null or o.amount_minor<>p_amount or o.currency<>p_currency then raise exception 'Payment mismatch'; end if;
  if o.status='paid' and o.provider_id=p_provider then return; end if;
  if o.status<>'pending' then raise exception 'Order not pending'; end if;
  update public.orders set status='paid',paid_at=now(),provider_id=p_provider where id=o.id;
  update public.promotion_redemptions set status='redeemed',redeemed_at=now() where order_id=o.id and status='reserved';
  update public.properties set status='draft' where id=o.property_id and status='payment_pending';
  perform app_private.audit('payment_paid','order',o.id);
  perform app_private.notify(o.user_id,'payment_receipt','Advertising payment received','Payment reference: '||o.reference||'. Submit your listing for moderation when ready.');
end; $$;

create or replace function public.manage_promotion(p_id uuid,p_data jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; normalized text; plan text; restricted uuid; max_uses int; per_user int; starts timestamptz; ends timestamptz; kind text; value bigint;
begin
  if not app_private.has_permission('settings') then raise exception 'Settings permission required.'; end if;
  normalized:=upper(trim(coalesce(p_data->>'code','')));
  if normalized !~ '^[A-Z0-9][A-Z0-9_-]{2,29}$' then raise exception 'Code must use 3 to 30 letters, numbers, hyphens or underscores.'; end if;
  if length(trim(coalesce(p_data->>'name','')))<3 then raise exception 'Promotion name must contain at least 3 characters.'; end if;
  kind:=p_data->>'discount_kind'; value:=coalesce((p_data->>'discount_value')::bigint,0);
  if not ((kind='percent' and value between 1 and 10000) or (kind='fixed' and value>0) or (kind='free' and value=0)) then raise exception 'Enter a valid promotion discount.'; end if;
  plan:=nullif(p_data->>'plan_id','');
  if plan is not null and not exists(select 1 from public.listing_plans where id=plan and price_minor>0) then raise exception 'Choose a paid advertising plan.'; end if;
  restricted:=nullif(p_data->>'restricted_user_id','')::uuid;
  max_uses:=nullif(p_data->>'max_redemptions','')::int;
  per_user:=coalesce(nullif(p_data->>'per_user_limit','')::int,1);
  starts:=coalesce(nullif(p_data->>'starts_at','')::timestamptz,now());
  ends:=nullif(p_data->>'ends_at','')::timestamptz;
  if ends is not null and ends<=starts then raise exception 'Promotion end date must be after its start date.'; end if;
  if max_uses is not null and max_uses<(select count(*) from public.promotion_redemptions where promotion_id=p_id and status in ('reserved','redeemed')) then raise exception 'Maximum uses cannot be below existing redemptions.'; end if;
  if p_id is null then
    insert into public.discount_promotions(code,name,discount_kind,discount_value,plan_id,starts_at,ends_at,max_redemptions,per_user_limit,first_listing_only,automatic,restricted_user_id,active,created_by)
    values(normalized,trim(p_data->>'name'),kind,value,plan,starts,ends,max_uses,per_user,coalesce((p_data->>'first_listing_only')::boolean,false),coalesce((p_data->>'automatic')::boolean,false),restricted,coalesce((p_data->>'active')::boolean,true),auth.uid()) returning id into result;
  else
    update public.discount_promotions set code=normalized,name=trim(p_data->>'name'),discount_kind=kind,discount_value=value,plan_id=plan,starts_at=starts,ends_at=ends,max_redemptions=max_uses,per_user_limit=per_user,first_listing_only=coalesce((p_data->>'first_listing_only')::boolean,false),automatic=coalesce((p_data->>'automatic')::boolean,false),restricted_user_id=restricted,active=coalesce((p_data->>'active')::boolean,true),updated_at=now() where id=p_id returning id into result;
    if result is null then raise exception 'Promotion not found.'; end if;
  end if;
  perform app_private.audit('promotion_saved','promotion',result,jsonb_build_object('code',normalized));
  return result;
end; $$;

revoke all on function public.quote_listing_promotion(uuid,text),public.create_order(uuid),public.create_order(uuid,text),public.manage_promotion(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.quote_listing_promotion(uuid,text),public.create_order(uuid),public.create_order(uuid,text),public.manage_promotion(uuid,jsonb) to authenticated;
revoke all on function public.fulfil_payment(text,text,bigint,text) from public,anon,authenticated;
grant execute on function public.fulfil_payment(text,text,bigint,text) to service_role;

insert into public.discount_promotions(code,name,discount_kind,discount_value,plan_id,first_listing_only,automatic,per_user_limit,active)
select 'FIRSTPLUS','First Plus advert free','free',0,'plus',true,true,1,true
where exists(select 1 from public.listing_plans where id='plus')
on conflict(code) do nothing;

-- Editorial metadata needed for useful search and social previews.
alter table public.content_pages
  add column if not exists author text not null default 'Enugu Properties Editorial Team' check(length(author) between 2 and 120),
  add column if not exists published_at timestamptz,
  add column if not exists seo_title text not null default '' check(length(seo_title) <= 160),
  add column if not exists meta_description text not null default '' check(length(meta_description) <= 320),
  add column if not exists social_image text not null default '' check(length(social_image) <= 500),
  add column if not exists indexable boolean not null default true,
  add column if not exists canonical_override text not null default '' check(length(canonical_override) <= 500);

drop function if exists public.save_content(text,text,text,text,boolean);
create function public.save_content(
  p_slug text,
  p_title text,
  p_description text,
  p_content text,
  p_published boolean,
  p_author text,
  p_seo_title text,
  p_meta_description text,
  p_social_image text,
  p_indexable boolean,
  p_canonical_override text
) returns void language plpgsql security definer set search_path='' as $$
begin
 if not app_private.has_permission('content') or p_slug !~ '^[a-z0-9-]+$' or length(p_title)<3 or length(p_content)<30 then
   raise exception 'Content permission and valid text required';
 end if;
 if p_canonical_override<>'' and p_canonical_override !~ '^https://enuguproperties\.com/' then
   raise exception 'Canonical override must use the Enugu Properties production domain';
 end if;
 insert into public.content_pages(slug,title,description,content,published,author,seo_title,meta_description,social_image,indexable,canonical_override,published_at)
 values(p_slug,p_title,p_description,p_content,p_published,p_author,p_seo_title,p_meta_description,p_social_image,p_indexable,p_canonical_override,case when p_published then now() end)
 on conflict(slug) do update set
   title=excluded.title,description=excluded.description,content=excluded.content,published=excluded.published,
   author=excluded.author,seo_title=excluded.seo_title,meta_description=excluded.meta_description,social_image=excluded.social_image,
   indexable=excluded.indexable,canonical_override=excluded.canonical_override,
   published_at=case when excluded.published and content_pages.published_at is null then now() else content_pages.published_at end,
   updated_at=now();
 perform app_private.audit('content_saved','content',null,jsonb_build_object('slug',p_slug,'published',p_published));
end; $$;
revoke all on function public.save_content(text,text,text,text,boolean,text,text,text,text,boolean,text) from public,anon;
grant execute on function public.save_content(text,text,text,text,boolean,text,text,text,text,boolean,text) to authenticated;

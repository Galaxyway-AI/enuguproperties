grant usage on schema app_private to anon;
grant execute on function app_private.has_permission(text) to anon;

-- No unaudited deletions or mutations of legal/audit history even from privileged service integrations.
create function app_private.immutable_record() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'This historical record is immutable'; end; $$;
create trigger audit_immutable before update or delete on public.audit_logs for each row execute function app_private.immutable_record();
create trigger revisions_immutable before update or delete on public.property_revisions for each row execute function app_private.immutable_record();
create trigger offer_history_immutable before update or delete on public.offer_events for each row execute function app_private.immutable_record();
create trigger transaction_history_immutable before update or delete on public.transaction_events for each row execute function app_private.immutable_record();
create trigger acceptance_immutable before update or delete on public.agreement_acceptances for each row execute function app_private.immutable_record();
-- Agreement availability may change; historical document text, version and hash may not.
create function app_private.agreement_immutable() returns trigger language plpgsql set search_path='' as $$ begin
 if tg_op='DELETE' or new.content is distinct from old.content or new.sha256 is distinct from old.sha256 or new.version is distinct from old.version or new.kind is distinct from old.kind then raise exception 'Publish a new agreement version'; end if;return new;end; $$;
create trigger agreement_immutable before update or delete on public.agreement_versions for each row execute function app_private.agreement_immutable();
create unique index one_active_agreement_per_kind on public.agreement_versions(kind) where active;

create function public.save_organisation(p_name text,p_kind text) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;begin
 if not app_private.active_user() or length(p_name)<3 or length(p_name)>160 or p_kind not in ('agency','developer','company') then raise exception 'Valid organisation details required'; end if;
 select id into result from public.organisations where created_by=auth.uid() limit 1;
 if result is null then insert into public.organisations(name,kind,created_by) values(p_name,p_kind,auth.uid()) returning id into result;insert into public.organisation_members values(result,auth.uid(),'owner');
 else update public.organisations set name=p_name,kind=p_kind where id=result;end if;
 perform app_private.audit('organisation_saved','organisation',result);return result;
end; $$;
revoke all on function public.save_organisation(text,text) from public,anon;
grant execute on function public.save_organisation(text,text) to authenticated;

create function public.update_commission(p_id uuid,p_status text,p_reference text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not app_private.has_permission('finance') or p_status not in ('due','invoiced','partially_paid','paid','waived','disputed','written_off') or length(p_reference)<3 then raise exception 'Finance permission and accounting reference required';end if;
 update public.commissions set status=p_status,invoice_reference=p_reference,paid_at=case when p_status='paid' then now() else paid_at end where id=p_id;
 perform app_private.audit('commission_'||p_status,'commission',p_id,jsonb_build_object('reference',p_reference));
end; $$;
revoke all on function public.update_commission(uuid,text,text) from public,anon;
grant execute on function public.update_commission(uuid,text,text) to authenticated;

-- Short private media requests always check a current account, not just possession of an old session.
create policy documents_active on public.property_documents as restrictive for select to authenticated using(app_private.active_user());
create policy media_active on public.property_media as restrictive for select to authenticated using(app_private.active_user());
create policy exact_location_active on public.property_private as restrictive for select to authenticated using(app_private.active_user());

-- Service role needs only intentional entrypoints; enforce explicit grants independently of Supabase defaults.
grant all on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;

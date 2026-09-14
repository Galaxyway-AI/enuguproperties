insert into public.roles(id) values('super_admin'),('property_moderator'),('verification_officer'),('inspector'),('transaction_manager'),('compliance_officer'),('support_agent'),('finance_admin') on conflict do nothing;
insert into public.permissions(id) values('moderate'),('verify'),('inspect'),('transactions'),('compliance'),('support'),('finance'),('settings'),('content'),('audit') on conflict do nothing;
insert into public.role_permissions select 'super_admin',id from public.permissions on conflict do nothing;
insert into public.role_permissions(role_id,permission_id) values
('property_moderator','moderate'),('property_moderator','audit'),('verification_officer','verify'),('verification_officer','audit'),('inspector','inspect'),('transaction_manager','transactions'),('compliance_officer','compliance'),('compliance_officer','verify'),('compliance_officer','audit'),('support_agent','support'),('finance_admin','finance') on conflict do nothing;
insert into public.listing_plans(id,name,price_minor,duration_days,photo_limit,video_limit,featured_days,visibility_weight,analytics) values
('free','Free',0,30,4,0,0,0,false),('plus','Plus',500000,45,15,1,0,1,true),('premium','Premium',1500000,60,30,3,7,2,true) on conflict do nothing;
insert into public.system_settings(key,value) values('commission','{"basis_points":200}'),('company','{"name":"MAGENCY ONLINE SOLUTIONS LTD","registration_number":null,"registered_address":null,"support_email":null,"phone":null,"whatsapp":null}'),('retention','{"status":"requires_legal_review","property_documents_days":null,"kyc_days":null}'),('verification_expiry','{"default_days":null}') on conflict do nothing;
insert into public.locations(name,slug,kind) values('Enugu State','enugu-state','state') on conflict do nothing;
insert into public.locations(name,slug,kind,parent_id) select 'Enugu metropolis','enugu-metropolis','city',id from public.locations where slug='enugu-state' on conflict do nothing;
insert into public.locations(name,slug,kind,parent_id)
 select area,lower(replace(area,' ','-')),'area',l.id from public.locations l cross join unnest(array['Independence Layout','GRA','Trans Ekulu','New Haven','Emene','Abakpa Nike','Uwani','Achara Layout','Coal Camp','Ogui','Ogui Road','Thinkers Corner','Nike','Centenary City','Maryland','Ugwuaji','Awkunanaw']) area where l.slug='enugu-metropolis' on conflict do nothing;
-- LGA assignments intentionally await local validation; no unverified hierarchy is invented.
insert into public.document_types(id,name,classification) values
('coo','Certificate of Occupancy','property'),('roo','Right of Occupancy','property'),('assignment','Deed of Assignment','property'),('conveyance','Deed of Conveyance','property'),('allocation','Allocation Letter','property'),('authority','Authority to Market','property'),('survey','Survey Plan','property'),('probate','Probate documents','property'),('inspection','Inspection evidence','property'),('search','Official search report','property'),('professional','Professional report','property'),('other','Other property evidence','property'),('identity','Identity document','kyc') on conflict do nothing;
insert into public.verification_types(id,name,meaning,limitation) values
('identity','Identity verified','Lister identity checked under the recorded procedure.','Does not establish ownership.'),
('authority','Authority to market confirmed','Evidence of marketing authority reviewed.','Does not establish legal title.'),
('site','Site inspected','Physical inspection completed and evidence approved.','Not a structural survey or title guarantee.'),
('documents','Documents reviewed','Preliminary review of supplied documents completed.','Does not guarantee authenticity or legal effect.'),
('official_search','Official search completed','The recorded search was completed with the stated provider.','Limited to the scope and date of the search.'),
('survey','Survey reviewed','Recorded survey review by an appropriate professional.','Other checks may still be needed.'),
('legal','Legal due diligence completed','The defined professional legal review was completed.','Not an unconditional guarantee of title.') on conflict do nothing;
-- No active legal agreement or fabricated professional credentials are seeded.
-- Publish a reviewed immutable agreement version before enabling seller submission.

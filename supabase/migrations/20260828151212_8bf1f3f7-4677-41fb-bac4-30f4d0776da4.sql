insert into public.verified_contractor_prospects (
  business_name, category, city, website_url, phone_primary, phone_e164, email,
  source, source_urls, phone_source_url, email_source_url, verification_status, data_quality_score,
  outreach_status, created_at, updated_at
)
select
  p.business_name,
  coalesce(p.category_slug, p.trade_category::text, p.trade::text, 'a_confirmer'),
  p.city,
  p.website_url,
  p.phone_e164,
  p.phone_e164,
  lower(p.email),
  coalesce(p.source, 'contractor_prospects'),
  to_jsonb(array[p.source_url]),
  case when p.phone_e164 is not null then p.source_url end,
  case when p.email is not null then p.source_url end,
  'needs_enrichment',
  75,
  'none',
  now(), now()
from public.contractor_prospects p
where p.source_url like 'http%'
  and coalesce(p.do_not_contact, false) = false
  and (p.phone_e164 is not null or p.email is not null)
  and not exists (
    select 1 from public.verified_contractor_prospects v
    where (v.phone_e164 is not null and v.phone_e164 = p.phone_e164)
       or (v.email is not null and p.email is not null and lower(v.email) = lower(p.email))
       or (length(regexp_replace(coalesce(p.business_name,''),'[^a-z0-9]','','gi')) > 4
           and lower(regexp_replace(coalesce(v.business_name,''),'[^a-z0-9]','','gi'))
             = lower(regexp_replace(coalesce(p.business_name,''),'[^a-z0-9]','','gi')))
  );
update public.verified_contractor_prospects
set source_urls = jsonb_build_object('official_registry', source_urls->>0, 'source', 'novoclimat_ventilation_list'),
    verification_status = 'verified',
    data_quality_score = 85,
    sms_eligibility_tier = 'C',
    sms_eligibility_confidence = 'medium',
    eligibility_reason = 'official_registry_provenance+twilio_valid_number',
    verified_at = now(),
    updated_at = now()
where source = 'official_verified_source'
  and outreach_status = 'none'
  and jsonb_typeof(source_urls) = 'array'
  and source_urls->>0 like 'https://cdn-contenu.quebec.ca/%';

UPDATE public.contractors
SET
  is_published = true,
  is_discoverable = true,
  is_accepting_appointments = true,
  activation_status = COALESCE(NULLIF(activation_status,''), 'active'),
  published_at = COALESCE(published_at, now()),
  updated_at = now()
WHERE account_status = 'active'
  AND COALESCE(is_published, false) = false
  AND slug IS NOT NULL
  AND business_name IS NOT NULL
  AND length(trim(business_name)) > 0;


-- Public-safe view for property map markers
-- Only exposes non-sensitive data: approximate location, scores, status
CREATE OR REPLACE VIEW public.v_property_map_markers AS
SELECT
  p.id,
  p.slug,
  p.city,
  p.neighborhood,
  p.property_type,
  p.year_built,
  p.photo_url,
  p.public_status,
  p.certification_status,
  p.estimated_score,
  -- Truncate coordinates to ~100m precision for privacy
  ROUND(p.latitude::numeric, 3) AS latitude,
  ROUND(p.longitude::numeric, 3) AS longitude,
  p.created_at
FROM public.properties p
WHERE p.latitude IS NOT NULL
  AND p.longitude IS NOT NULL
  AND p.public_status IS NOT NULL
  AND p.public_status != 'private';

-- Public-safe view for renovation activity map layer
-- Uses approved contributions and public property events only
CREATE OR REPLACE VIEW public.v_renovation_activity_map AS
SELECT
  cc.id,
  cc.work_type,
  cc.status AS contribution_status,
  cc.work_date,
  cc.created_at,
  -- Only approximate location
  ROUND(p.latitude::numeric, 3) AS latitude,
  ROUND(p.longitude::numeric, 3) AS longitude,
  p.city,
  p.neighborhood,
  -- Contractor info only if public page exists
  CASE WHEN cpp.is_published = true THEN c.business_name ELSE NULL END AS contractor_name,
  CASE WHEN cpp.is_published = true THEN c.slug ELSE NULL END AS contractor_slug
FROM public.contractor_contributions cc
JOIN public.properties p ON p.id = cc.property_id
LEFT JOIN public.contractors c ON c.id = cc.contractor_id
LEFT JOIN public.contractor_public_pages cpp ON cpp.contractor_id = c.id
WHERE cc.status = 'approved'
  AND p.latitude IS NOT NULL
  AND p.longitude IS NOT NULL;

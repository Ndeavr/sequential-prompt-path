
-- Block 6: Extend projects table with missing fields
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS preferred_contact text DEFAULT 'phone',
  ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS matching_status text DEFAULT 'pending';

-- Contractor trust summary view (aggregates existing signals)
CREATE OR REPLACE VIEW public.v_contractor_trust_summary AS
SELECT
  c.id AS contractor_id,
  c.business_name,
  c.verification_status,
  c.aipp_score,
  c.rating,
  c.review_count,
  c.years_experience,
  -- Credentials summary
  (SELECT count(*) FROM public.contractor_credentials cr WHERE cr.contractor_id = c.id AND cr.verification_status = 'verified') AS verified_credentials_count,
  (SELECT bool_or(cr.credential_type = 'rbq' AND cr.verification_status = 'verified') FROM public.contractor_credentials cr WHERE cr.contractor_id = c.id) AS rbq_verified,
  (SELECT bool_or(cr.credential_type = 'neq' AND cr.verification_status = 'verified') FROM public.contractor_credentials cr WHERE cr.contractor_id = c.id) AS neq_verified,
  (SELECT bool_or(cr.credential_type = 'insurance' AND cr.verification_status = 'verified') FROM public.contractor_credentials cr WHERE cr.contractor_id = c.id) AS insurance_verified,
  -- Public scores
  ps.trust_score,
  ps.unpro_score,
  ps.visibility_score,
  ps.profile_completeness_score,
  -- Performance
  pm.response_time_avg_hours,
  pm.appointment_show_rate,
  pm.close_rate,
  pm.review_sentiment_score,
  pm.complaint_rate
FROM public.contractors c
LEFT JOIN public.contractor_public_scores ps ON ps.contractor_id = c.id
LEFT JOIN public.contractor_performance_metrics pm ON pm.contractor_id = c.id;

-- Index for faster project matching queries
CREATE INDEX IF NOT EXISTS idx_projects_matching_status ON public.projects (matching_status);
CREATE INDEX IF NOT EXISTS idx_projects_category_id ON public.projects (category_id);

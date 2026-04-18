-- 1. Stop signup_hunter
UPDATE public.challenge_agent_state SET enabled = false WHERE agent_key = 'signup_hunter';

-- 2. Disqualifier les compétiteurs / annuaires
UPDATE public.outbound_leads
SET qualification_status = 'disqualified_competitor',
    rejection_reason = 'competitor_or_directory',
    updated_at = now()
WHERE (
  email ILIKE 'info@www.%'
  OR email ILIKE '%soumissionrenovation%'
  OR email ILIKE '%pagesjaunes%'
  OR email ILIKE '%facebook%'
  OR email ILIKE '%@google.com'
  OR email ILIKE '%yelp%'
  OR email ILIKE '%houzz%'
  OR email ILIKE '%homestars%'
  OR email ILIKE '%kijiji%'
  OR email ILIKE '%trouvetonpro%'
  OR email ILIKE '%reno-assistance%'
  OR email ILIKE '%renoquotes%'
  OR email ILIKE '%homeguide%'
  OR email ILIKE '%kompass%'
  OR email ILIKE '%canada411%'
  OR email ILIKE '%411.ca%'
  OR email ILIKE '%bbb.org%'
  OR email ILIKE '%linkedin%'
  OR email ILIKE '%instagram%'
  OR email ILIKE '%twitter%'
  OR email ILIKE '%youtube%'
  OR domain ILIKE '%soumissionrenovation%'
  OR domain ILIKE '%reno-assistance%'
  OR domain ILIKE '%homestars%'
  OR domain ILIKE '%houzz%'
  OR domain ILIKE '%pagesjaunes%'
  OR company_name ILIKE '%soumission%'
  OR company_name ILIKE '%pages jaunes%'
  OR company_name ILIKE '%reno-assistance%'
  OR company_name ILIKE '%homestars%'
  OR company_name ILIKE '%houzz%'
)
AND COALESCE(qualification_status, '') != 'disqualified_competitor';

-- 3. Annuler les events qualifiés à tort
UPDATE public.challenge_signup_events
SET event_type = 'prospect_rejected_competitor'
WHERE event_type = 'prospect_qualified'
  AND agent_source = 'signup_hunter'
  AND outbound_lead_id IN (
    SELECT id FROM public.outbound_leads WHERE qualification_status = 'disqualified_competitor'
  );

-- 4. Blocklist permanente
CREATE TABLE IF NOT EXISTS public.challenge_domain_blocklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern text NOT NULL UNIQUE,
  reason text NOT NULL DEFAULT 'competitor',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.challenge_domain_blocklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage blocklist"
ON public.challenge_domain_blocklist
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.challenge_domain_blocklist (pattern, reason) VALUES
  ('soumissionrenovation', 'competitor_aggregator'),
  ('reno-assistance', 'competitor_aggregator'),
  ('renoquotes', 'competitor_aggregator'),
  ('homestars', 'competitor_aggregator'),
  ('houzz', 'competitor_aggregator'),
  ('trouvetonpro', 'competitor_aggregator'),
  ('homeguide', 'competitor_aggregator'),
  ('pagesjaunes', 'directory'),
  ('canada411', 'directory'),
  ('411.ca', 'directory'),
  ('kompass', 'directory'),
  ('bbb.org', 'directory'),
  ('facebook', 'social_platform'),
  ('linkedin', 'social_platform'),
  ('instagram', 'social_platform'),
  ('twitter', 'social_platform'),
  ('youtube', 'social_platform'),
  ('google.com', 'social_platform'),
  ('yelp', 'social_platform'),
  ('kijiji', 'classifieds'),
  ('craigslist', 'classifieds'),
  ('info@www.', 'malformed_email')
ON CONFLICT (pattern) DO NOTHING;
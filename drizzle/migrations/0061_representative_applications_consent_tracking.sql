ALTER TABLE public.affiliate_applications
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS wants_team_lead boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS terms_acknowledged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_text text,
  ADD COLUMN IF NOT EXISTS consented_at timestamptz,
  ADD COLUMN IF NOT EXISTS utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS journey jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS locale text,
  ADD COLUMN IF NOT EXISTS ip_hash text,
  ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS affiliate_applications_idempotency_uidx
  ON public.affiliate_applications (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS affiliate_applications_email_lower_idx
  ON public.affiliate_applications (lower(email));
CREATE INDEX IF NOT EXISTS affiliate_applications_ip_recent_idx
  ON public.affiliate_applications (ip_hash, created_at);

-- Candidatures publiques : uniquement via la fonction serveur (validation, anti-spam, dédoublonnage).
DROP POLICY IF EXISTS "Public can submit applications" ON public.affiliate_applications;
REVOKE INSERT ON public.affiliate_applications FROM anon;
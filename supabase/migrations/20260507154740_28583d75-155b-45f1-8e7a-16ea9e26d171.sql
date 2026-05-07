
-- Slugs privés (URL → partenaire + code PIN)
CREATE TABLE public.private_access_slugs (
  slug TEXT PRIMARY KEY,
  code_hash TEXT,
  partner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_unlock_at TIMESTAMPTZ,
  unlock_count INT NOT NULL DEFAULT 0
);
ALTER TABLE public.private_access_slugs ENABLE ROW LEVEL SECURITY;
-- Aucune policy → seul service-role accède.

-- Tentatives (rate-limit)
CREATE TABLE public.private_access_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  ip TEXT,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_paa_slug_time ON public.private_access_attempts(slug, created_at DESC);
ALTER TABLE public.private_access_attempts ENABLE ROW LEVEL SECURITY;

-- Appels assignés
CREATE TABLE public.partner_call_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  lead_id UUID NOT NULL REFERENCES public.entrepreneur_leads(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'todo',
  notes TEXT,
  called_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id, lead_id)
);
CREATE INDEX idx_pca_partner_status ON public.partner_call_assignments(partner_id, status);
ALTER TABLE public.partner_call_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners read own calls"
ON public.partner_call_assignments FOR SELECT
USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "partners update own calls"
ON public.partner_call_assignments FOR UPDATE
USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "admins all calls"
ON public.partner_call_assignments FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_pca_updated
BEFORE UPDATE ON public.partner_call_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.contractor_profile_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  expires_at TIMESTAMPTZ,
  opened_count INTEGER NOT NULL DEFAULT 0,
  last_opened_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contractor_profile_invites_contractor ON public.contractor_profile_invites(contractor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_profile_invites TO authenticated;
GRANT ALL ON public.contractor_profile_invites TO service_role;
ALTER TABLE public.contractor_profile_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage contractor profile invites"
  ON public.contractor_profile_invites FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.contractor_profile_facts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_label TEXT,
  field_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  provenance TEXT NOT NULL DEFAULT 'public_source' CHECK (provenance IN ('public_source','confirmed_by_company','verified_unpro')),
  source_url TEXT,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contractor_id, field_key)
);
CREATE INDEX idx_contractor_profile_facts_contractor ON public.contractor_profile_facts(contractor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contractor_profile_facts TO authenticated;
GRANT ALL ON public.contractor_profile_facts TO service_role;
ALTER TABLE public.contractor_profile_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage contractor profile facts"
  ON public.contractor_profile_facts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Contractors read their own profile facts"
  ON public.contractor_profile_facts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid()));

CREATE TRIGGER trg_contractor_profile_invites_updated
  BEFORE UPDATE ON public.contractor_profile_invites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_contractor_profile_facts_updated
  BEFORE UPDATE ON public.contractor_profile_facts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
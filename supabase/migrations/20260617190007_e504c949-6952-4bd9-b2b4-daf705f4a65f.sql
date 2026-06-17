
-- Extend phone_carrier_cache
ALTER TABLE public.phone_carrier_cache
  ADD COLUMN IF NOT EXISTS validated_at timestamptz NOT NULL DEFAULT now();

-- Extend communication_logs with fallback chain history
ALTER TABLE public.communication_logs
  ADD COLUMN IF NOT EXISTS fallback_chain jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS channel_decision_reason text;

-- ============================================================
-- contact_verification_queue
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contact_verification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  contact_person_name text,
  role text,
  email text,
  phone text,
  phone_type text CHECK (phone_type IN ('mobile','landline','voip','unknown','invalid')),
  website text,
  google_business_url text,
  rbq_number text,
  rbq_business_name text,
  rbq_status text,
  neq_number text,
  neq_business_name text,
  neq_status text,
  match_confidence text NOT NULL DEFAULT 'low' CHECK (match_confidence IN ('high','medium','low','conflict')),
  match_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  verification_status text NOT NULL DEFAULT 'new' CHECK (verification_status IN ('new','needs_manual_review','verified','contacted','replied','not_interested','wrong_contact','unreachable','duplicate','rejected')),
  best_contact_method text CHECK (best_contact_method IN ('email','sms','phone_call','contact_form','linkedin','unknown')),
  manual_contact_priority_score integer NOT NULL DEFAULT 0,
  last_contacted_at timestamptz,
  next_followup_at timestamptz,
  notes text,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_lead_id uuid,
  source_table text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_verification_queue TO authenticated;
GRANT ALL ON public.contact_verification_queue TO service_role;

ALTER TABLE public.contact_verification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_cvq" ON public.contact_verification_queue
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_cvq_status ON public.contact_verification_queue (verification_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cvq_confidence ON public.contact_verification_queue (match_confidence);
CREATE INDEX IF NOT EXISTS idx_cvq_priority ON public.contact_verification_queue (manual_contact_priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_cvq_phone_type ON public.contact_verification_queue (phone_type);
CREATE INDEX IF NOT EXISTS idx_cvq_next_followup ON public.contact_verification_queue (next_followup_at) WHERE next_followup_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_cvq_updated_at ON public.contact_verification_queue;
CREATE TRIGGER update_cvq_updated_at
  BEFORE UPDATE ON public.contact_verification_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- contact_verification_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contact_verification_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_verification_id uuid NOT NULL REFERENCES public.contact_verification_queue(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_verification_notes TO authenticated;
GRANT ALL ON public.contact_verification_notes TO service_role;

ALTER TABLE public.contact_verification_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_cvn" ON public.contact_verification_notes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_cvn_parent ON public.contact_verification_notes (contact_verification_id, created_at DESC);

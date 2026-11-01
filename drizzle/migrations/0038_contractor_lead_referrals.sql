CREATE TABLE public.contractor_lead_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT ('LR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  dedupe_hash text NOT NULL,
  client_name text NOT NULL,
  client_phone text,
  client_email text,
  city_or_postal text NOT NULL,
  address text,
  service_requested text NOT NULL,
  project_description text NOT NULL,
  timeline text,
  transfer_reason text NOT NULL CHECK (transfer_reason IN ('out_of_territory','out_of_specialty','no_availability','other')),
  transfer_reason_other text,
  attestation_text text NOT NULL,
  attestation_version text NOT NULL,
  attested_at timestamptz NOT NULL DEFAULT now(),
  declared_agreement_date date,
  declared_agreement_mode text,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received','in_review','accepted','refused')),
  credit_status text NOT NULL DEFAULT 'to_evaluate' CHECK (credit_status IN ('to_evaluate','granted','not_granted')),
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  locale text NOT NULL DEFAULT 'fr',
  is_synthetic boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (client_phone IS NOT NULL OR client_email IS NOT NULL)
);
CREATE UNIQUE INDEX contractor_lead_referrals_dedupe ON public.contractor_lead_referrals (contractor_id, dedupe_hash);
CREATE INDEX contractor_lead_referrals_contractor ON public.contractor_lead_referrals (contractor_id, created_at DESC);

GRANT SELECT, UPDATE ON public.contractor_lead_referrals TO authenticated;
GRANT ALL ON public.contractor_lead_referrals TO service_role;
ALTER TABLE public.contractor_lead_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own lead referrals" ON public.contractor_lead_referrals
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid()));
CREATE POLICY "Admins read lead referrals" ON public.contractor_lead_referrals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins review lead referrals" ON public.contractor_lead_referrals
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin review may change only review fields; reviewer and time are stamped server-side (audit).
CREATE OR REPLACE FUNCTION public.guard_contractor_lead_referral_review()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() <> 'service_role' AND (
       (to_jsonb(NEW) - ARRAY['status','credit_status','admin_notes','reviewed_by','reviewed_at','updated_at'])
    <> (to_jsonb(OLD) - ARRAY['status','credit_status','admin_notes','reviewed_by','reviewed_at','updated_at'])) THEN
    RAISE EXCEPTION 'Only review fields can be changed';
  END IF;
  NEW.updated_at := now();
  IF NEW.status IS DISTINCT FROM OLD.status OR NEW.credit_status IS DISTINCT FROM OLD.credit_status OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER contractor_lead_referrals_review_guard BEFORE UPDATE ON public.contractor_lead_referrals
  FOR EACH ROW EXECUTE FUNCTION public.guard_contractor_lead_referral_review();
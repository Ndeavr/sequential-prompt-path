CREATE TABLE IF NOT EXISTS public.first_dollar_active_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  prospect_id uuid,
  contractor_lead_id uuid,
  phone_e164 text,
  provider_message_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.first_dollar_active_run TO authenticated;
GRANT ALL ON public.first_dollar_active_run TO service_role;

ALTER TABLE public.first_dollar_active_run ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read active run" ON public.first_dollar_active_run;
CREATE POLICY "Admins read active run" ON public.first_dollar_active_run
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage active run" ON public.first_dollar_active_run;
CREATE POLICY "Admins manage active run" ON public.first_dollar_active_run
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS first_dollar_active_run_single_active
  ON public.first_dollar_active_run (is_active) WHERE is_active;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_first_dollar_active_run_updated ON public.first_dollar_active_run;
CREATE TRIGGER trg_first_dollar_active_run_updated
  BEFORE UPDATE ON public.first_dollar_active_run
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.first_dollar_active_run (label, prospect_id, contractor_lead_id, phone_e164, provider_message_id, is_active)
SELECT 'Electro Pompe',
       'aa4ebd75-0000-0000-0000-000000000000'::uuid,
       NULL::uuid,
       '+14503285551',
       'SM7770bec70bfd1ea15d88ef8b13a3888b',
       true
WHERE NOT EXISTS (SELECT 1 FROM public.first_dollar_active_run WHERE is_active);

UPDATE public.first_dollar_active_run r
SET prospect_id = p.id
FROM public.verified_contractor_prospects p
WHERE r.is_active
  AND (p.outreach_twilio_sid = r.provider_message_id OR p.phone_e164 = r.phone_e164);

UPDATE public.first_dollar_active_run r
SET contractor_lead_id = cl.id
FROM public.contractor_leads cl
WHERE r.is_active
  AND r.contractor_lead_id IS NULL
  AND (cl.source_prospect_id = r.prospect_id OR cl.phone_e164 = r.phone_e164);

CREATE OR REPLACE VIEW public.v_first_dollar_tracker
WITH (security_invoker = true) AS
WITH pin AS (
  SELECT prospect_id, contractor_lead_id, phone_e164, provider_message_id
  FROM public.first_dollar_active_run
  WHERE is_active
  LIMIT 1
), active AS (
  SELECT p.id, p.phone_e164, p.business_name, p.outreach_twilio_sid,
         p.outreach_sent_at, p.outreach_delivered_at, p.outreach_clicked_at
  FROM public.verified_contractor_prospects p, pin
  WHERE p.id = pin.prospect_id
     OR (pin.prospect_id IS NULL AND pin.provider_message_id IS NOT NULL AND p.outreach_twilio_sid = pin.provider_message_id)
  LIMIT 1
), linked_lead AS (
  SELECT cl.id, cl.onboarding_started_at, cl.paid_at, cl.activation_status, cl.updated_at, cl.contractor_id
  FROM public.contractor_leads cl, pin
  LEFT JOIN LATERAL (SELECT 1) x ON true
  WHERE cl.id = pin.contractor_lead_id
     OR (pin.contractor_lead_id IS NULL AND (cl.source_prospect_id = pin.prospect_id
         OR (cl.phone_e164 IS NOT NULL AND cl.phone_e164 = pin.phone_e164)))
  ORDER BY (CASE WHEN cl.id = pin.contractor_lead_id THEN 0
                 WHEN cl.source_prospect_id = pin.prospect_id THEN 1 ELSE 2 END), cl.created_at
  LIMIT 1
), tokens AS (
  SELECT DISTINCT ape.metadata ->> 'token' AS token
  FROM public.acquisition_pipeline_events ape, active a
  WHERE ape.prospect_id = a.id AND ape.metadata ? 'token' AND (ape.metadata ->> 'token') IS NOT NULL
), click_from_prospect AS (
  SELECT a.outreach_clicked_at AS at FROM active a
), click_from_short_links AS (
  SELECT min(slc.clicked_at) AS at FROM public.short_link_clicks slc
  WHERE slc.slug IN (SELECT token FROM tokens WHERE token IS NOT NULL)
), click_from_tracking_links AS (
  SELECT min(atl.first_click_at) AS at
  FROM public.acquisition_tracking_links atl, active a
  WHERE atl.prospect_id = a.id AND atl.first_click_at IS NOT NULL
), click_from_events AS (
  SELECT min(ce.occurred_at) AS at
  FROM public.click_events ce, active a
  WHERE ce.provider_message_id = a.outreach_twilio_sid
     OR ce.tracking_id IN (SELECT token FROM tokens WHERE token IS NOT NULL)
     OR (ce.source_table = 'verified_contractor_prospects' AND ce.source_row_id = a.id::text)
     OR (ce.source_table = 'contractor_leads' AND ce.source_row_id = (SELECT id::text FROM linked_lead))
), click_first AS (
  SELECT NULLIF(LEAST(
    COALESCE((SELECT at FROM click_from_prospect), 'infinity'::timestamptz),
    COALESCE((SELECT at FROM click_from_short_links), 'infinity'::timestamptz),
    COALESCE((SELECT at FROM click_from_tracking_links), 'infinity'::timestamptz),
    COALESCE((SELECT at FROM click_from_events), 'infinity'::timestamptz)
  ), 'infinity'::timestamptz) AS at
), registration_first AS (
  SELECT onboarding_started_at AS at FROM linked_lead
), paid_from_lead AS (
  SELECT paid_at AS at FROM linked_lead
), paid_from_recruitment AS (
  SELECT min(crp.paid_at) AS at
  FROM public.contractor_recruitment_payments crp, active a
  WHERE crp.prospect_id = a.id AND crp.paid_at IS NOT NULL
), paid_from_events AS (
  SELECT min(pe.created_at) AS at
  FROM public.acq_payment_events pe, linked_lead ll
  WHERE ll.contractor_id IS NOT NULL AND pe.contractor_id = ll.contractor_id
    AND pe.event_type = ANY (ARRAY['payment_succeeded','payment_success','activation_paid','charge.succeeded'])
), paid_first AS (
  SELECT NULLIF(LEAST(
    COALESCE((SELECT at FROM paid_from_lead), 'infinity'::timestamptz),
    COALESCE((SELECT at FROM paid_from_recruitment), 'infinity'::timestamptz),
    COALESCE((SELECT at FROM paid_from_events), 'infinity'::timestamptz)
  ), 'infinity'::timestamptz) AS at
), activation_from_pipeline AS (
  SELECT min(ape.created_at) AS at
  FROM public.acquisition_pipeline_events ape, active a
  WHERE ape.prospect_id = a.id AND ape.stage = 'activated'
), activation_from_lead AS (
  SELECT CASE WHEN activation_status = ANY (ARRAY['activated','completed','live'])
              THEN COALESCE(paid_at, updated_at) END AS at
  FROM linked_lead
), activation_first AS (
  SELECT NULLIF(LEAST(
    COALESCE((SELECT at FROM activation_from_pipeline), 'infinity'::timestamptz),
    COALESCE((SELECT at FROM activation_from_lead), 'infinity'::timestamptz)
  ), 'infinity'::timestamptz) AS at
), appointment_first AS (
  SELECT min(ap.created_at) AS at
  FROM public.appointments ap, linked_lead ll
  WHERE ll.contractor_id IS NOT NULL AND ap.contractor_id = ll.contractor_id
    AND ap.status::text = ANY (ARRAY['requested','scheduled','confirmed','completed'])
)
SELECT
  (SELECT id FROM active) AS active_prospect_id,
  (SELECT business_name FROM active) AS active_business_name,
  (SELECT outreach_twilio_sid FROM active) AS active_provider_message_id,
  (SELECT id FROM linked_lead) AS active_contractor_lead_id,
  (SELECT outreach_sent_at FROM active) AS run_started_at,
  (SELECT outreach_sent_at FROM active) AS first_sms_sent_at,
  (SELECT outreach_delivered_at FROM active) AS first_delivery_at,
  (SELECT at FROM click_first) AS first_click_at,
  (SELECT at FROM registration_first) AS first_activation_at,
  (SELECT at FROM paid_first) AS first_paid_at,
  (SELECT at FROM activation_first) AS first_contractor_activation_at,
  (SELECT at FROM appointment_first) AS first_appointment_at,
  CASE
    WHEN (SELECT id FROM active) IS NULL THEN 'First SMS Sent'
    WHEN (SELECT at FROM click_first) IS NULL THEN 'First Click'
    WHEN (SELECT at FROM registration_first) IS NULL THEN 'First Registration'
    WHEN (SELECT at FROM paid_first) IS NULL THEN 'First $1 Payment'
    WHEN (SELECT at FROM activation_first) IS NULL THEN 'First Activation'
    WHEN (SELECT at FROM appointment_first) IS NULL THEN 'First Appointment'
    ELSE 'Scale'
  END AS next_missing_milestone,
  CASE WHEN (SELECT id FROM linked_lead) IS NULL AND (SELECT id FROM active) IS NOT NULL
       THEN 'attribution_lead_missing' END AS attribution_warning,
  CASE WHEN (SELECT id FROM active) IS NOT NULL AND (SELECT outreach_delivered_at FROM active) IS NULL
       THEN 'delivery_callback_missing' END AS telemetry_warning;
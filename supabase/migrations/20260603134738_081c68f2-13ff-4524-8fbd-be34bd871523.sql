
-- Concierge activation layer
ALTER TABLE public.contractor_prospects
  ADD COLUMN IF NOT EXISTS concierge_owner_id uuid,
  ADD COLUMN IF NOT EXISTS concierge_priority smallint,
  ADD COLUMN IF NOT EXISTS next_action_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS concierge_notes text,
  ADD COLUMN IF NOT EXISTS custom_offer jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS concierge_stage text;

CREATE INDEX IF NOT EXISTS idx_cp_concierge_owner ON public.contractor_prospects(concierge_owner_id) WHERE concierge_owner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cp_concierge_stage ON public.contractor_prospects(concierge_stage) WHERE concierge_stage IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.concierge_touches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.contractor_prospects(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('sms','email','call','voicemail','inperson','note','system')),
  direction text NOT NULL CHECK (direction IN ('out','in','internal')),
  body text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concierge_touches_prospect ON public.concierge_touches(prospect_id, occurred_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.concierge_touches TO authenticated;
GRANT ALL ON public.concierge_touches TO service_role;

ALTER TABLE public.concierge_touches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage concierge touches"
  ON public.concierge_touches
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Precision-targeting view
CREATE OR REPLACE VIEW public.v_concierge_targets
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.business_name,
  p.owner_name,
  p.category_slug,
  p.trade,
  p.city,
  p.region,
  p.phone,
  p.email,
  p.website_url,
  p.review_count,
  p.review_rating,
  p.aipp_score,
  p.outreach_status,
  p.payment_status,
  p.activation_status,
  p.concierge_owner_id,
  p.concierge_priority,
  p.concierge_stage,
  p.next_action,
  p.next_action_due_at,
  p.last_action_at,
  p.public_slug,
  -- Computed targeting score
  ROUND(
    COALESCE(p.review_count, 0)::numeric
    * GREATEST(0, 100 - COALESCE(p.aipp_score, 50))
    * CASE
        WHEN p.category_slug IN ('isolation','isolation d''entretoits ','toiture','plomberie','plombier','excavation') THEN 1.5
        ELSE 1.0
      END
  , 2) AS concierge_target_score
FROM public.contractor_prospects p
WHERE p.do_not_contact = false
  AND p.payment_status = 'not_started'
  AND COALESCE(p.review_rating, 0) >= 4.4
  AND COALESCE(p.review_count, 0) >= 25;

GRANT SELECT ON public.v_concierge_targets TO authenticated;

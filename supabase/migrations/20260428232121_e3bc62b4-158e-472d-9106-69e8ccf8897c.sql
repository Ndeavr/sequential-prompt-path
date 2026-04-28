-- Manual contractor activations: lightweight audit log + ensure idempotency uniques

CREATE TABLE IF NOT EXISTS public.manual_contractor_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  admin_user_id uuid NOT NULL,
  plan_code text NOT NULL,
  plan_amount_cents integer NOT NULL DEFAULT 0,
  paid_date timestamptz NOT NULL DEFAULT now(),
  expiry_date timestamptz NOT NULL,
  payment_method text NOT NULL DEFAULT 'manuel',
  note text,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_contractor_activations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read manual activations" ON public.manual_contractor_activations;
CREATE POLICY "Admins read manual activations"
ON public.manual_contractor_activations FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins insert manual activations" ON public.manual_contractor_activations;
CREATE POLICY "Admins insert manual activations"
ON public.manual_contractor_activations FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_manual_activations_contractor ON public.manual_contractor_activations(contractor_id);
CREATE INDEX IF NOT EXISTS idx_manual_activations_admin ON public.manual_contractor_activations(admin_user_id);

-- Slug uniqueness on contractors (if not already enforced)
CREATE UNIQUE INDEX IF NOT EXISTS idx_contractors_slug_unique ON public.contractors(slug) WHERE slug IS NOT NULL;
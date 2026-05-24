
CREATE TABLE public.growth_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_token text,
  business_type text,
  city text,
  team_size integer,
  sales_reps integer,
  trucks integer,
  monthly_projects integer,
  annual_revenue numeric,
  avg_contract_value numeric,
  monthly_appointments integer,
  monthly_leads integer,
  closing_rate numeric,
  seasonality text,
  uses_shared_leads text,
  current_step text DEFAULT 'hero',
  status text DEFAULT 'in_progress',
  recommended_plan text,
  projected_revenue numeric,
  projected_loss_monthly numeric,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_growth_diagnostics_user ON public.growth_diagnostics(user_id);
CREATE INDEX idx_growth_diagnostics_guest ON public.growth_diagnostics(guest_token);

CREATE TABLE public.growth_diagnostic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id uuid NOT NULL REFERENCES public.growth_diagnostics(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_growth_diag_events_diag ON public.growth_diagnostic_events(diagnostic_id);

CREATE TABLE public.growth_diagnostic_bubbles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id uuid NOT NULL REFERENCES public.growth_diagnostics(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  value_numeric numeric,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_growth_diag_bubbles_diag ON public.growth_diagnostic_bubbles(diagnostic_id);

ALTER TABLE public.growth_diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_diagnostic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_diagnostic_bubbles ENABLE ROW LEVEL SECURITY;

-- growth_diagnostics policies: owner (user_id) OR guest_token match
CREATE POLICY "diag_select_owner_or_guest" ON public.growth_diagnostics
FOR SELECT USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (guest_token IS NOT NULL)
);
CREATE POLICY "diag_insert_owner_or_guest" ON public.growth_diagnostics
FOR INSERT WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (auth.uid() IS NULL AND guest_token IS NOT NULL)
);
CREATE POLICY "diag_update_owner_or_guest" ON public.growth_diagnostics
FOR UPDATE USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (guest_token IS NOT NULL)
);

-- events policies: through parent diagnostic
CREATE POLICY "diag_events_select" ON public.growth_diagnostic_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.growth_diagnostics d
    WHERE d.id = diagnostic_id
      AND ((auth.uid() IS NOT NULL AND d.user_id = auth.uid()) OR d.guest_token IS NOT NULL)
  )
);
CREATE POLICY "diag_events_insert" ON public.growth_diagnostic_events
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.growth_diagnostics d
    WHERE d.id = diagnostic_id
      AND ((auth.uid() IS NOT NULL AND d.user_id = auth.uid()) OR d.guest_token IS NOT NULL)
  )
);

-- bubbles policies: through parent diagnostic
CREATE POLICY "diag_bubbles_select" ON public.growth_diagnostic_bubbles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.growth_diagnostics d
    WHERE d.id = diagnostic_id
      AND ((auth.uid() IS NOT NULL AND d.user_id = auth.uid()) OR d.guest_token IS NOT NULL)
  )
);
CREATE POLICY "diag_bubbles_insert" ON public.growth_diagnostic_bubbles
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.growth_diagnostics d
    WHERE d.id = diagnostic_id
      AND ((auth.uid() IS NOT NULL AND d.user_id = auth.uid()) OR d.guest_token IS NOT NULL)
  )
);

-- timestamp trigger
CREATE TRIGGER trg_growth_diagnostics_updated_at
BEFORE UPDATE ON public.growth_diagnostics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

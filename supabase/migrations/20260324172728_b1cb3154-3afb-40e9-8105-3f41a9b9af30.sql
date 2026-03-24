
-- Plan activations
CREATE TABLE public.plan_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE CASCADE NOT NULL,
  plan_code TEXT NOT NULL,
  activation_status TEXT NOT NULL DEFAULT 'pending',
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_activations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activations"
  ON public.plan_activations FOR SELECT
  TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own activations"
  ON public.plan_activations FOR INSERT
  TO authenticated
  WITH CHECK (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own activations"
  ON public.plan_activations FOR UPDATE
  TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- Activation steps
CREATE TABLE public.activation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID REFERENCES public.contractors(id) ON DELETE CASCADE NOT NULL,
  step_code TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activation_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own steps"
  ON public.activation_steps FOR SELECT
  TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own steps"
  ON public.activation_steps FOR INSERT
  TO authenticated
  WITH CHECK (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own steps"
  ON public.activation_steps FOR UPDATE
  TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

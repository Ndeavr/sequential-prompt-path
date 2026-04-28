-- ─── 1. Loop tracking ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.omega_loop_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_date date NOT NULL DEFAULT CURRENT_DATE,
  phase text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT omega_loop_phase_check CHECK (phase IN (
    'prospect_discovery','enrichment','scoring','campaign_generation',
    'outreach_send','metrics_optimize'
  )),
  CONSTRAINT omega_loop_status_check CHECK (status IN ('running','success','failed','skipped'))
);
CREATE UNIQUE INDEX IF NOT EXISTS omega_loop_runs_date_phase_uniq
  ON public.omega_loop_runs (loop_date, phase)
  WHERE phase <> 'outreach_send';
CREATE INDEX IF NOT EXISTS omega_loop_runs_recent_idx
  ON public.omega_loop_runs (started_at DESC);

ALTER TABLE public.omega_loop_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_omega_loop_runs" ON public.omega_loop_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ─── 2. Expansion opportunities ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.expansion_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  current_plan text NOT NULL,
  recommended_plan text NOT NULL,
  signal jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  pitched_at timestamptz,
  resolved_at timestamptz,
  CONSTRAINT expansion_status_check CHECK (status IN ('pending','pitched','accepted','declined','expired'))
);
CREATE INDEX IF NOT EXISTS expansion_opps_contractor_idx
  ON public.expansion_opportunities (contractor_id);
CREATE INDEX IF NOT EXISTS expansion_opps_pending_idx
  ON public.expansion_opportunities (status, created_at DESC)
  WHERE status = 'pending';

ALTER TABLE public.expansion_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_expansion_opps" ON public.expansion_opportunities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ─── 3. Churn signals ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.churn_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  detected_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'open',
  rescue_attempt jsonb,
  resolved_at timestamptz,
  CONSTRAINT churn_signal_type_check CHECK (signal_type IN (
    'payment_failed','inactive_login','no_leads_opened','downgrade_intent'
  )),
  CONSTRAINT churn_severity_check CHECK (severity IN ('low','medium','high','critical')),
  CONSTRAINT churn_status_check CHECK (status IN ('open','rescued','lost','ignored'))
);
CREATE INDEX IF NOT EXISTS churn_signals_open_idx
  ON public.churn_signals (severity, detected_at DESC)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS churn_signals_contractor_idx
  ON public.churn_signals (contractor_id);

ALTER TABLE public.churn_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_churn_signals" ON public.churn_signals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
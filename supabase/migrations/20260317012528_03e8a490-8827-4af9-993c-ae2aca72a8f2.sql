-- Growth Engine: New tables for autonomous growth flywheel

-- 1. Growth Events — central log of all flywheel activities
CREATE TABLE public.growth_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  source_engine text NOT NULL,
  entity_type text,
  entity_id uuid,
  title text,
  description text,
  metadata jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_growth_events_type ON public.growth_events(event_type, created_at DESC);
CREATE INDEX idx_growth_events_status ON public.growth_events(status, created_at DESC);
CREATE INDEX idx_growth_events_source ON public.growth_events(source_engine, created_at DESC);

-- 2. Growth Engine Metrics — traffic and conversion intelligence snapshots
CREATE TABLE public.growth_engine_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  metric_type text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  dimension_key text,
  dimension_value text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_gem_upsert ON public.growth_engine_metrics(metric_date, metric_type, COALESCE(dimension_key, ''), COALESCE(dimension_value, ''));
CREATE INDEX idx_gem_date ON public.growth_engine_metrics(metric_date DESC, metric_type);

-- RLS: admin-only for both tables
ALTER TABLE public.growth_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_engine_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage growth_events"
  ON public.growth_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage growth_engine_metrics"
  ON public.growth_engine_metrics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role access growth_events"
  ON public.growth_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role access growth_engine_metrics"
  ON public.growth_engine_metrics FOR ALL TO service_role
  USING (true) WITH CHECK (true);
-- 1. Founder approvals
CREATE TABLE IF NOT EXISTS public.founder_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('message','offer','funnel_behavior','pricing','new_agent','strategy','other')),
  title text NOT NULL,
  proposed_change jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected_impact text,
  risk_level text NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
  rollback_plan text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','modified','executed','failed')),
  proposed_by_agent text,
  target_key text,
  decided_by uuid,
  decided_at timestamptz,
  execution_result jsonb,
  executed_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_approvals TO authenticated;
GRANT ALL ON public.founder_approvals TO service_role;
ALTER TABLE public.founder_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_founder_approvals"
ON public.founder_approvals FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS founder_approvals_pending_idx
  ON public.founder_approvals (status, created_at DESC);

-- 2. Founder call tasks
CREATE TABLE IF NOT EXISTS public.founder_call_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text,
  source_record_id uuid,
  affiliate_id uuid,
  contractor_id uuid,
  business_name text,
  contact_name text,
  phone text,
  email text,
  city text,
  service_category text,
  priority_score numeric NOT NULL DEFAULT 0,
  reason text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggested_script text,
  objective text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','called','reached','no_answer','callback','won','lost','skipped')),
  outcome_note text,
  next_action text,
  called_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_call_tasks TO authenticated;
GRANT ALL ON public.founder_call_tasks TO service_role;
ALTER TABLE public.founder_call_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_founder_call_tasks"
ON public.founder_call_tasks FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS founder_call_tasks_queue_idx
  ON public.founder_call_tasks (status, priority_score DESC);

-- 3. Learning ledger
CREATE TABLE IF NOT EXISTS public.agent_learning_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tactic_key text NOT NULL,
  channel text,
  variant text,
  service_category text,
  city text,
  source text,
  data_class text NOT NULL DEFAULT 'verified' CHECK (data_class IN ('verified','declared','inferred','pending')),
  attempts integer NOT NULL DEFAULT 0,
  delivered integer NOT NULL DEFAULT 0,
  clicked integer NOT NULL DEFAULT 0,
  signups integer NOT NULL DEFAULT 0,
  activations integer NOT NULL DEFAULT 0,
  appointments integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  revenue_cents bigint NOT NULL DEFAULT 0,
  window_start timestamptz,
  window_end timestamptz,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.agent_learning_outcomes TO authenticated;
GRANT ALL ON public.agent_learning_outcomes TO service_role;
ALTER TABLE public.agent_learning_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_read_agent_learning_outcomes"
ON public.agent_learning_outcomes FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS agent_learning_outcomes_tactic_idx
  ON public.agent_learning_outcomes (
    tactic_key,
    coalesce(channel,''),
    coalesce(variant,''),
    coalesce(service_category,''),
    coalesce(city,''),
    coalesce(source,'')
  );

CREATE OR REPLACE VIEW public.v_tactic_performance
WITH (security_invoker = true) AS
SELECT
  tactic_key, channel, variant, service_category, city, source, data_class,
  attempts, delivered, clicked, signups, activations, conversions, revenue_cents,
  CASE WHEN attempts > 0 THEN round(delivered::numeric / attempts, 4) ELSE 0 END AS delivered_rate,
  CASE WHEN delivered > 0 THEN round(clicked::numeric / delivered, 4) ELSE 0 END AS click_rate,
  CASE WHEN attempts > 0 THEN round(activations::numeric / attempts, 4) ELSE 0 END AS activation_rate,
  computed_at
FROM public.agent_learning_outcomes
WHERE data_class = 'verified'
ORDER BY activations DESC, clicked DESC;

GRANT SELECT ON public.v_tactic_performance TO authenticated;
GRANT SELECT ON public.v_tactic_performance TO service_role;

-- 4. Agent activation governance trigger
CREATE OR REPLACE FUNCTION public.enforce_agent_activation_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  v_key := coalesce(NEW.agent_key, NEW.id::text);

  IF EXISTS (
    SELECT 1 FROM public.founder_approvals fa
    WHERE fa.kind = 'new_agent'
      AND fa.status IN ('approved','executed')
      AND fa.target_key = v_key
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Agent activation blocked: no approved founder approval for agent %', v_key
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_agent_activation_approval ON public.agent_registry;
CREATE TRIGGER trg_enforce_agent_activation_approval
BEFORE INSERT OR UPDATE OF status ON public.agent_registry
FOR EACH ROW EXECUTE FUNCTION public.enforce_agent_activation_approval();

-- 5. updated_at triggers
CREATE TRIGGER trg_founder_approvals_updated
BEFORE UPDATE ON public.founder_approvals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_founder_call_tasks_updated
BEFORE UPDATE ON public.founder_call_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_agent_learning_outcomes_updated
BEFORE UPDATE ON public.agent_learning_outcomes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Phase 5: Unified Activation

-- 1) Activation ledger
CREATE TABLE IF NOT EXISTS public.contractor_activation_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('activated','reactivated','deactivated','noop')),
  source TEXT NOT NULL,
  actor_id UUID,
  plan_id TEXT,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contractor_activation_ledger TO authenticated;
GRANT ALL ON public.contractor_activation_ledger TO service_role;

ALTER TABLE public.contractor_activation_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read activation ledger"
  ON public.contractor_activation_ledger FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_activation_ledger_contractor ON public.contractor_activation_ledger(contractor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activation_ledger_source ON public.contractor_activation_ledger(source, created_at DESC);

-- 2) Idempotent unified activation
CREATE OR REPLACE FUNCTION public.activate_contractor_unified(
  p_contractor_id UUID,
  p_source TEXT,
  p_plan_id TEXT DEFAULT NULL,
  p_actor UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contractor RECORD;
  v_before JSONB;
  v_after JSONB;
  v_action TEXT;
  v_sub_exists BOOLEAN;
BEGIN
  IF p_contractor_id IS NULL THEN
    RAISE EXCEPTION 'contractor_id required';
  END IF;

  SELECT id, is_published, published_at, user_id
    INTO v_contractor
  FROM public.contractors
  WHERE id = p_contractor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'contractor % not found', p_contractor_id;
  END IF;

  v_before := jsonb_build_object(
    'is_published', v_contractor.is_published,
    'published_at', v_contractor.published_at
  );

  IF v_contractor.is_published THEN
    v_action := 'noop';
  ELSE
    UPDATE public.contractors
       SET is_published = true,
           published_at = COALESCE(published_at, now())
     WHERE id = p_contractor_id;
    v_action := 'activated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.contractor_subscriptions
     WHERE contractor_id = p_contractor_id
       AND status IN ('active','trialing')
  ) INTO v_sub_exists;

  IF NOT v_sub_exists AND p_plan_id IS NOT NULL THEN
    INSERT INTO public.contractor_subscriptions (
      contractor_id, plan_id, status, payment_status,
      activation_source, activated_by, activation_note
    ) VALUES (
      p_contractor_id, p_plan_id, 'active', 'paid',
      p_source, p_actor, 'Auto-provisioned via activate_contractor_unified'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  UPDATE public.contractor_prospects
     SET activation_status = 'activated',
         payment_status = 'paid',
         updated_at = now()
   WHERE contractor_id = p_contractor_id
     AND (activation_status IS DISTINCT FROM 'activated'
          OR payment_status IS DISTINCT FROM 'paid');

  SELECT jsonb_build_object(
    'is_published', is_published,
    'published_at', published_at
  ) INTO v_after
  FROM public.contractors WHERE id = p_contractor_id;

  INSERT INTO public.contractor_activation_ledger (
    contractor_id, action, source, actor_id, plan_id,
    before_state, after_state, metadata
  ) VALUES (
    p_contractor_id, v_action, p_source, p_actor, p_plan_id,
    v_before, v_after, COALESCE(p_metadata, '{}'::jsonb)
  );

  BEGIN
    PERFORM public.record_engagement_event(
      _stage := 'activation',
      _event := 'profile_activated',
      _contractor_id := p_contractor_id,
      _source_table := 'activate_contractor_unified',
      _source_id := p_contractor_id::text,
      _provider_message_id := 'activation:' || p_contractor_id::text,
      _payload := jsonb_build_object('source', p_source, 'plan_id', p_plan_id, 'action', v_action)
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'contractor_id', p_contractor_id,
    'action', v_action,
    'source', p_source,
    'before', v_before,
    'after', v_after
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_contractor_unified(UUID, TEXT, TEXT, UUID, JSONB) TO service_role, authenticated;

-- 3) Trigger on subscription
CREATE OR REPLACE FUNCTION public.trg_activate_on_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.contractor_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status IN ('active','trialing')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
  THEN
    PERFORM public.activate_contractor_unified(
      NEW.contractor_id,
      COALESCE(NEW.activation_source, 'stripe'),
      NEW.plan_id,
      NEW.activated_by,
      jsonb_build_object('subscription_id', NEW.id, 'stripe_subscription_id', NEW.stripe_subscription_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activate_on_subscription ON public.contractor_subscriptions;
CREATE TRIGGER trg_activate_on_subscription
AFTER INSERT OR UPDATE OF status ON public.contractor_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.trg_activate_on_subscription();

-- 4) Stalled activations report
CREATE OR REPLACE FUNCTION public.stalled_activations_report(p_min_age_minutes INTEGER DEFAULT 10)
RETURNS TABLE(
  contractor_id UUID,
  reason TEXT,
  detected_source TEXT,
  paid_at TIMESTAMPTZ,
  age_minutes INTEGER,
  plan_id TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cs.contractor_id,
         'subscription_active_not_published'::text,
         'stripe'::text,
         cs.created_at,
         (EXTRACT(EPOCH FROM (now() - cs.created_at))/60)::int,
         cs.plan_id
    FROM public.contractor_subscriptions cs
    JOIN public.contractors c ON c.id = cs.contractor_id
   WHERE cs.status IN ('active','trialing')
     AND cs.payment_status = 'paid'
     AND c.is_published = false
     AND cs.created_at < now() - make_interval(mins => p_min_age_minutes)

  UNION ALL

  SELECT p.contractor_id,
         'prospect_paid_not_published'::text,
         COALESCE(p.source, 'unknown')::text,
         p.updated_at,
         (EXTRACT(EPOCH FROM (now() - p.updated_at))/60)::int,
         p.selected_plan
    FROM public.contractor_prospects p
    JOIN public.contractors c ON c.id = p.contractor_id
   WHERE p.payment_status = 'paid'
     AND c.is_published = false
     AND p.updated_at < now() - make_interval(mins => p_min_age_minutes);
$$;

GRANT EXECUTE ON FUNCTION public.stalled_activations_report(INTEGER) TO authenticated, service_role;

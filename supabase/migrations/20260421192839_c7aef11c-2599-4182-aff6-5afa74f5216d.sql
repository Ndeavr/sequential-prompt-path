
-- pricing_rules: admin-managed modifiers
CREATE TABLE public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  applies_to_plan TEXT NULL,
  applies_to_category TEXT NULL,
  applies_to_city TEXT NULL,
  applies_to_cluster_key TEXT NULL,
  modifier_percent NUMERIC(6,4) NULL,
  override_price NUMERIC(10,2) NULL,
  priority INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active pricing rules"
  ON public.pricing_rules FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage pricing rules"
  ON public.pricing_rules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- pricing_decisions: audit trail
CREATE TABLE public.pricing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NULL REFERENCES public.contractors(id) ON DELETE SET NULL,
  sniper_target_id UUID NULL REFERENCES public.sniper_targets(id) ON DELETE SET NULL,
  audit_id UUID NULL REFERENCES public.contractor_aipp_audits(id) ON DELETE SET NULL,
  recommended_plan TEXT NOT NULL,
  recommended_billing TEXT NOT NULL,
  base_price NUMERIC(10,2) NOT NULL,
  adjusted_price NUMERIC(10,2) NOT NULL,
  founder_price NUMERIC(10,2) NULL,
  pricing_modifiers JSONB NOT NULL DEFAULT '[]'::jsonb,
  rationale JSONB NOT NULL DEFAULT '[]'::jsonb,
  founder_offer_visible BOOLEAN NOT NULL DEFAULT false,
  cluster_key TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pricing decisions"
  ON public.pricing_decisions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create pricing decisions"
  ON public.pricing_decisions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_pricing_decisions_contractor ON public.pricing_decisions(contractor_id);
CREATE INDEX idx_pricing_decisions_target ON public.pricing_decisions(sniper_target_id);
CREATE INDEX idx_pricing_rules_active ON public.pricing_rules(is_active) WHERE is_active = true;

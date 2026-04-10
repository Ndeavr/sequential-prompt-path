
-- ============================================
-- UNPRO Condo Core Platform — Missing Tables
-- ============================================

-- 1. Assemblies (AG)
CREATE TABLE IF NOT EXISTS public.syndicate_assemblies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  title text NOT NULL,
  assembly_type text NOT NULL DEFAULT 'annual' CHECK (assembly_type IN ('annual', 'special', 'extraordinary')),
  scheduled_date timestamptz NOT NULL,
  location text,
  quorum_required integer DEFAULT 50,
  quorum_reached boolean DEFAULT false,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  minutes_document_id uuid REFERENCES public.syndicate_documents(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_assemblies ENABLE ROW LEVEL SECURITY;

-- 2. Motions
CREATE TABLE IF NOT EXISTS public.syndicate_motions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid NOT NULL REFERENCES public.syndicate_assemblies(id) ON DELETE CASCADE,
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text DEFAULT 'general' CHECK (category IN ('general', 'financial', 'maintenance', 'rules', 'management', 'special')),
  sort_order integer DEFAULT 0,
  decision text CHECK (decision IN ('approved', 'rejected', 'tabled', 'withdrawn')),
  votes_for integer DEFAULT 0,
  votes_against integer DEFAULT 0,
  votes_abstain integer DEFAULT 0,
  requires_supermajority boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'voting', 'decided')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_motions ENABLE ROW LEVEL SECURITY;

-- 3. Vote Records (individual votes)
CREATE TABLE IF NOT EXISTS public.syndicate_vote_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  motion_id uuid NOT NULL REFERENCES public.syndicate_motions(id) ON DELETE CASCADE,
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote text NOT NULL CHECK (vote IN ('yes', 'no', 'abstain')),
  voted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(motion_id, user_id)
);
ALTER TABLE public.syndicate_vote_records ENABLE ROW LEVEL SECURITY;

-- 4. Invoices
CREATE TABLE IF NOT EXISTS public.syndicate_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  supplier_name text NOT NULL,
  description text,
  amount_cents integer NOT NULL DEFAULT 0,
  tax_gst_cents integer DEFAULT 0,
  tax_qst_cents integer DEFAULT 0,
  total_cents integer GENERATED ALWAYS AS (amount_cents + COALESCE(tax_gst_cents, 0) + COALESCE(tax_qst_cents, 0)) STORED,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed', 'cancelled')),
  category text DEFAULT 'general' CHECK (category IN ('general', 'maintenance', 'insurance', 'management', 'utilities', 'legal', 'reserve_fund')),
  file_url text,
  ocr_status text DEFAULT 'none' CHECK (ocr_status IN ('none', 'processing', 'completed', 'failed')),
  ocr_data jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_invoices ENABLE ROW LEVEL SECURITY;

-- 5. Budgets
CREATE TABLE IF NOT EXISTS public.syndicate_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  fiscal_year integer NOT NULL,
  operating_budget_cents integer DEFAULT 0,
  reserve_fund_contribution_cents integer DEFAULT 0,
  total_budget_cents integer GENERATED ALWAYS AS (COALESCE(operating_budget_cents, 0) + COALESCE(reserve_fund_contribution_cents, 0)) STORED,
  reserve_fund_balance_cents integer DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'proposed', 'approved', 'active', 'closed')),
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(syndicate_id, fiscal_year)
);
ALTER TABLE public.syndicate_budgets ENABLE ROW LEVEL SECURITY;

-- 6. Expenses
CREATE TABLE IF NOT EXISTS public.syndicate_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  budget_id uuid REFERENCES public.syndicate_budgets(id),
  invoice_id uuid REFERENCES public.syndicate_invoices(id),
  description text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  category text DEFAULT 'general',
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  is_reserve_fund boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_expenses ENABLE ROW LEVEL SECURITY;

-- 7. Alerts
CREATE TABLE IF NOT EXISTS public.syndicate_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  alert_type text NOT NULL DEFAULT 'info' CHECK (alert_type IN ('info', 'warning', 'urgent', 'compliance', 'maintenance', 'financial')),
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  message text,
  is_read boolean DEFAULT false,
  is_dismissed boolean DEFAULT false,
  action_url text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_alerts ENABLE ROW LEVEL SECURITY;

-- 8. Document Versions
CREATE TABLE IF NOT EXISTS public.syndicate_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.syndicate_documents(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  file_url text NOT NULL,
  file_size_bytes integer,
  uploaded_by uuid,
  change_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id, version_number)
);
ALTER TABLE public.syndicate_document_versions ENABLE ROW LEVEL SECURITY;

-- 9. Activity Logs
CREATE TABLE IF NOT EXISTS public.syndicate_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  syndicate_id uuid NOT NULL REFERENCES public.syndicates(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.syndicate_activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_syndicate_assemblies_syndicate ON public.syndicate_assemblies(syndicate_id);
CREATE INDEX IF NOT EXISTS idx_syndicate_motions_assembly ON public.syndicate_motions(assembly_id);
CREATE INDEX IF NOT EXISTS idx_syndicate_vote_records_motion ON public.syndicate_vote_records(motion_id);
CREATE INDEX IF NOT EXISTS idx_syndicate_invoices_syndicate ON public.syndicate_invoices(syndicate_id);
CREATE INDEX IF NOT EXISTS idx_syndicate_budgets_syndicate ON public.syndicate_budgets(syndicate_id);
CREATE INDEX IF NOT EXISTS idx_syndicate_expenses_syndicate ON public.syndicate_expenses(syndicate_id);
CREATE INDEX IF NOT EXISTS idx_syndicate_alerts_syndicate ON public.syndicate_alerts(syndicate_id);
CREATE INDEX IF NOT EXISTS idx_syndicate_document_versions_doc ON public.syndicate_document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_syndicate_activity_logs_syndicate ON public.syndicate_activity_logs(syndicate_id);

-- ============================================
-- RLS Policies (using is_syndicate_admin function that already exists)
-- ============================================

-- Assemblies: members can view, admins can manage
CREATE POLICY "Members can view assemblies" ON public.syndicate_assemblies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.syndicate_members sm WHERE sm.syndicate_id = syndicate_assemblies.syndicate_id AND sm.user_id = auth.uid() AND sm.is_active = true)
  );
CREATE POLICY "Admins can manage assemblies" ON public.syndicate_assemblies
  FOR ALL USING (public.is_syndicate_admin(auth.uid(), syndicate_id))
  WITH CHECK (public.is_syndicate_admin(auth.uid(), syndicate_id));

-- Motions: members can view, admins can manage
CREATE POLICY "Members can view motions" ON public.syndicate_motions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.syndicate_members sm WHERE sm.syndicate_id = syndicate_motions.syndicate_id AND sm.user_id = auth.uid() AND sm.is_active = true)
  );
CREATE POLICY "Admins can manage motions" ON public.syndicate_motions
  FOR ALL USING (public.is_syndicate_admin(auth.uid(), syndicate_id))
  WITH CHECK (public.is_syndicate_admin(auth.uid(), syndicate_id));

-- Vote records: users can view own votes, admins can view all
CREATE POLICY "Users can view own votes" ON public.syndicate_vote_records
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Members can cast votes" ON public.syndicate_vote_records
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.syndicate_members sm WHERE sm.syndicate_id = syndicate_vote_records.syndicate_id AND sm.user_id = auth.uid() AND sm.is_active = true)
  );
CREATE POLICY "Admins can view all votes" ON public.syndicate_vote_records
  FOR SELECT USING (public.is_syndicate_admin(auth.uid(), syndicate_id));

-- Invoices: members can view, admins can manage
CREATE POLICY "Members can view invoices" ON public.syndicate_invoices
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.syndicate_members sm WHERE sm.syndicate_id = syndicate_invoices.syndicate_id AND sm.user_id = auth.uid() AND sm.is_active = true)
  );
CREATE POLICY "Admins can manage invoices" ON public.syndicate_invoices
  FOR ALL USING (public.is_syndicate_admin(auth.uid(), syndicate_id))
  WITH CHECK (public.is_syndicate_admin(auth.uid(), syndicate_id));

-- Budgets: members can view, admins can manage
CREATE POLICY "Members can view budgets" ON public.syndicate_budgets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.syndicate_members sm WHERE sm.syndicate_id = syndicate_budgets.syndicate_id AND sm.user_id = auth.uid() AND sm.is_active = true)
  );
CREATE POLICY "Admins can manage budgets" ON public.syndicate_budgets
  FOR ALL USING (public.is_syndicate_admin(auth.uid(), syndicate_id))
  WITH CHECK (public.is_syndicate_admin(auth.uid(), syndicate_id));

-- Expenses: members can view, admins can manage
CREATE POLICY "Members can view expenses" ON public.syndicate_expenses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.syndicate_members sm WHERE sm.syndicate_id = syndicate_expenses.syndicate_id AND sm.user_id = auth.uid() AND sm.is_active = true)
  );
CREATE POLICY "Admins can manage expenses" ON public.syndicate_expenses
  FOR ALL USING (public.is_syndicate_admin(auth.uid(), syndicate_id))
  WITH CHECK (public.is_syndicate_admin(auth.uid(), syndicate_id));

-- Alerts: members can view, system/admins can manage
CREATE POLICY "Members can view alerts" ON public.syndicate_alerts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.syndicate_members sm WHERE sm.syndicate_id = syndicate_alerts.syndicate_id AND sm.user_id = auth.uid() AND sm.is_active = true)
  );
CREATE POLICY "Admins can manage alerts" ON public.syndicate_alerts
  FOR ALL USING (public.is_syndicate_admin(auth.uid(), syndicate_id))
  WITH CHECK (public.is_syndicate_admin(auth.uid(), syndicate_id));

-- Document versions: members can view, admins can manage
CREATE POLICY "Members can view document versions" ON public.syndicate_document_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.syndicate_documents sd
      JOIN public.syndicate_members sm ON sm.syndicate_id = sd.syndicate_id
      WHERE sd.id = syndicate_document_versions.document_id AND sm.user_id = auth.uid() AND sm.is_active = true
    )
  );
CREATE POLICY "Admins can manage document versions" ON public.syndicate_document_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.syndicate_documents sd
      WHERE sd.id = syndicate_document_versions.document_id AND public.is_syndicate_admin(auth.uid(), sd.syndicate_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.syndicate_documents sd
      WHERE sd.id = syndicate_document_versions.document_id AND public.is_syndicate_admin(auth.uid(), sd.syndicate_id)
    )
  );

-- Activity logs: members can view (read-only for audit)
CREATE POLICY "Members can view activity logs" ON public.syndicate_activity_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.syndicate_members sm WHERE sm.syndicate_id = syndicate_activity_logs.syndicate_id AND sm.user_id = auth.uid() AND sm.is_active = true)
  );
CREATE POLICY "Admins can insert activity logs" ON public.syndicate_activity_logs
  FOR INSERT WITH CHECK (public.is_syndicate_admin(auth.uid(), syndicate_id));

-- ============================================
-- Updated_at triggers
-- ============================================
CREATE TRIGGER set_syndicate_assemblies_updated_at BEFORE UPDATE ON public.syndicate_assemblies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_syndicate_invoices_updated_at BEFORE UPDATE ON public.syndicate_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_syndicate_budgets_updated_at BEFORE UPDATE ON public.syndicate_budgets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

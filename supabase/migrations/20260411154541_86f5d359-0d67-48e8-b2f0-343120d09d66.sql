
-- =============================================
-- Quote Separation: Comparison vs Client Record
-- =============================================

-- 1. quote_comparison_sessions
CREATE TABLE public.quote_comparison_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid NULL,
  session_title text NOT NULL DEFAULT 'Nouvelle analyse',
  comparison_status text NOT NULL DEFAULT 'draft'
    CHECK (comparison_status IN ('draft','uploading','processing','completed','failed')),
  source_context text NOT NULL DEFAULT 'web_cta'
    CHECK (source_context IN ('homeowner_manual','alex_guided','web_cta','mobile_cta')),
  comparison_count integer NOT NULL DEFAULT 0,
  selected_result_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_comparison_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own comparison sessions"
  ON public.quote_comparison_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. quote_comparison_items
CREATE TABLE public.quote_comparison_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_session_id uuid NOT NULL REFERENCES public.quote_comparison_sessions(id) ON DELETE CASCADE,
  uploaded_by_user_id uuid NOT NULL,
  slot_index integer NOT NULL CHECK (slot_index BETWEEN 1 AND 3),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'application/pdf',
  ocr_status text NOT NULL DEFAULT 'pending'
    CHECK (ocr_status IN ('pending','processed','failed','not_required')),
  parsed_vendor_name text NULL,
  parsed_amount numeric NULL,
  parsed_scope_summary text NULL,
  parsed_warranty_summary text NULL,
  parsed_exclusions_summary text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comparison_session_id, slot_index)
);

ALTER TABLE public.quote_comparison_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own comparison items"
  ON public.quote_comparison_items FOR ALL
  TO authenticated
  USING (uploaded_by_user_id = auth.uid())
  WITH CHECK (uploaded_by_user_id = auth.uid());

-- 3. quote_analysis_results
CREATE TABLE public.quote_analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_session_id uuid NOT NULL REFERENCES public.quote_comparison_sessions(id) ON DELETE CASCADE UNIQUE,
  best_value_quote_item_id uuid NULL REFERENCES public.quote_comparison_items(id),
  lowest_price_quote_item_id uuid NULL REFERENCES public.quote_comparison_items(id),
  highest_coverage_quote_item_id uuid NULL REFERENCES public.quote_comparison_items(id),
  risk_flags_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  coverage_matrix_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_matrix_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary_recommendation text NULL,
  confidence_score numeric NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own analysis results"
  ON public.quote_analysis_results FOR SELECT
  TO authenticated
  USING (
    comparison_session_id IN (
      SELECT id FROM public.quote_comparison_sessions WHERE user_id = auth.uid()
    )
  );

-- 4. client_record_quotes
CREATE TABLE public.client_record_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id uuid NULL,
  property_id uuid NULL,
  created_by_user_id uuid NOT NULL,
  created_by_role text NOT NULL DEFAULT 'homeowner'
    CHECK (created_by_role IN ('homeowner','contractor','rep','admin')),
  contractor_id uuid NULL,
  quote_title text NOT NULL,
  quote_description text NULL,
  quote_amount numeric NULL,
  currency_code text NOT NULL DEFAULT 'CAD',
  quote_date date NULL,
  quote_status text NOT NULL DEFAULT 'draft'
    CHECK (quote_status IN ('draft','submitted','viewed','accepted','rejected','expired','archived')),
  visibility_scope text NOT NULL DEFAULT 'private_client'
    CHECK (visibility_scope IN ('private_client','shared_client_contractor','admin_only')),
  source_type text NOT NULL DEFAULT 'manual_record'
    CHECK (source_type IN ('manual_record','contractor_upload','rep_upload','analysis_saved_copy')),
  comparison_session_id uuid NULL REFERENCES public.quote_comparison_sessions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_record_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own client record quotes"
  ON public.client_record_quotes FOR ALL
  TO authenticated
  USING (created_by_user_id = auth.uid())
  WITH CHECK (created_by_user_id = auth.uid());

-- 5. client_record_quote_files
CREATE TABLE public.client_record_quote_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_record_quote_id uuid NOT NULL REFERENCES public.client_record_quotes(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text NOT NULL DEFAULT 'application/pdf',
  file_size integer NULL,
  uploaded_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_record_quote_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own client record files"
  ON public.client_record_quote_files FOR ALL
  TO authenticated
  USING (uploaded_by_user_id = auth.uid())
  WITH CHECK (uploaded_by_user_id = auth.uid());

-- 6. quote_activity_logs
CREATE TABLE public.quote_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_type text NOT NULL
    CHECK (entity_type IN ('comparison_session','comparison_item','analysis_result','client_record_quote')),
  entity_id uuid NOT NULL,
  action_type text NOT NULL
    CHECK (action_type IN ('create','upload','analyze','save_to_record','update','delete','view')),
  metadata_json jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own activity logs"
  ON public.quote_activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own activity logs"
  ON public.quote_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_comparison_sessions_user ON public.quote_comparison_sessions(user_id);
CREATE INDEX idx_comparison_items_session ON public.quote_comparison_items(comparison_session_id);
CREATE INDEX idx_analysis_results_session ON public.quote_analysis_results(comparison_session_id);
CREATE INDEX idx_client_record_quotes_user ON public.client_record_quotes(created_by_user_id);
CREATE INDEX idx_client_record_quotes_property ON public.client_record_quotes(property_id);
CREATE INDEX idx_client_record_files_quote ON public.client_record_quote_files(client_record_quote_id);
CREATE INDEX idx_quote_activity_entity ON public.quote_activity_logs(entity_type, entity_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_comparison_sessions_updated
  BEFORE UPDATE ON public.quote_comparison_sessions
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

CREATE TRIGGER trg_client_record_quotes_updated
  BEFORE UPDATE ON public.client_record_quotes
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

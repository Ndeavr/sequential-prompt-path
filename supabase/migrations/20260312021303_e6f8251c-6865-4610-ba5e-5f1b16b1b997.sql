
-- ================================================================
-- UNPRO Matching Engine Schema
-- ================================================================

-- A) alignment_questions
CREATE TABLE public.alignment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  category text NOT NULL,
  question_fr text NOT NULL,
  question_en text NOT NULL,
  answer_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  weight numeric NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alignment_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active alignment questions" ON public.alignment_questions
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Admins can manage alignment questions" ON public.alignment_questions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- B) profile_alignment_answers
CREATE TABLE public.profile_alignment_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  question_id uuid NOT NULL REFERENCES public.alignment_questions(id) ON DELETE CASCADE,
  answer_code text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  confidence numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_user_or_contractor CHECK (user_id IS NOT NULL OR contractor_id IS NOT NULL)
);

CREATE INDEX idx_paa_user ON public.profile_alignment_answers(user_id);
CREATE INDEX idx_paa_contractor ON public.profile_alignment_answers(contractor_id);
CREATE INDEX idx_paa_question ON public.profile_alignment_answers(question_id);

ALTER TABLE public.profile_alignment_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own alignment answers" ON public.profile_alignment_answers
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Contractors can manage own alignment answers" ON public.profile_alignment_answers
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = profile_alignment_answers.contractor_id AND c.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = profile_alignment_answers.contractor_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all alignment answers" ON public.profile_alignment_answers
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- C) homeowner_dna_profiles
CREATE TABLE public.homeowner_dna_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  dna_type text NOT NULL,
  dna_label_fr text NOT NULL,
  dna_label_en text NOT NULL,
  traits jsonb NOT NULL DEFAULT '{}'::jsonb,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric NOT NULL DEFAULT 0.5,
  generated_by text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hdna_user ON public.homeowner_dna_profiles(user_id);
ALTER TABLE public.homeowner_dna_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own DNA" ON public.homeowner_dna_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all homeowner DNA" ON public.homeowner_dna_profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- D) contractor_dna_profiles
CREATE TABLE public.contractor_dna_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  dna_type text NOT NULL,
  dna_label_fr text NOT NULL,
  dna_label_en text NOT NULL,
  traits jsonb NOT NULL DEFAULT '{}'::jsonb,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric NOT NULL DEFAULT 0.5,
  generated_by text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cdna_contractor ON public.contractor_dna_profiles(contractor_id);
ALTER TABLE public.contractor_dna_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors can view own DNA" ON public.contractor_dna_profiles
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_dna_profiles.contractor_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all contractor DNA" ON public.contractor_dna_profiles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages contractor DNA" ON public.contractor_dna_profiles
  FOR ALL TO service_role USING (true);

-- E) project_context_snapshots
CREATE TABLE public.project_context_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  user_id uuid,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  project_type text,
  subcategory text,
  urgency text DEFAULT 'normal',
  declared_budget_min numeric,
  declared_budget_max numeric,
  occupancy_status text DEFAULT 'occupied',
  timeline_preference text,
  constraints jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pcs_user ON public.project_context_snapshots(user_id);
CREATE INDEX idx_pcs_project ON public.project_context_snapshots(project_id);
ALTER TABLE public.project_context_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own project context" ON public.project_context_snapshots
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all project context" ON public.project_context_snapshots
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- F) review_items
CREATE TABLE public.review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  source_platform text NOT NULL DEFAULT 'google',
  external_review_id text,
  reviewer_name text,
  reviewer_profile_url text,
  reviewer_review_count integer DEFAULT 0,
  reviewer_photo_count integer DEFAULT 0,
  reviewer_local_guide_level integer DEFAULT 0,
  review_rating integer NOT NULL,
  review_text text,
  review_date date,
  detected_language text DEFAULT 'fr',
  sentiment_score numeric DEFAULT 0,
  authenticity_score numeric DEFAULT 50,
  temporal_suspicion_score numeric DEFAULT 0,
  reviewer_credibility_score numeric DEFAULT 50,
  linguistic_authenticity_score numeric DEFAULT 50,
  contextual_specificity_score numeric DEFAULT 50,
  extracted_themes jsonb DEFAULT '[]'::jsonb,
  suspicion_flags jsonb DEFAULT '[]'::jsonb,
  is_weighted_out boolean NOT NULL DEFAULT false,
  weight_factor numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ri_contractor ON public.review_items(contractor_id);
CREATE INDEX idx_ri_source ON public.review_items(source_platform);
ALTER TABLE public.review_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all review items" ON public.review_items
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages review items" ON public.review_items
  FOR ALL TO service_role USING (true);

-- G) review_insights
CREATE TABLE public.review_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  source_platform text DEFAULT 'all',
  review_count_analyzed integer DEFAULT 0,
  period_start date,
  period_end date,
  overall_sentiment_score numeric DEFAULT 0,
  review_intelligence_score numeric DEFAULT 0,
  authenticity_score numeric DEFAULT 50,
  fake_review_risk numeric DEFAULT 0,
  review_reliability_factor numeric DEFAULT 0.5,
  temporal_authenticity_score numeric DEFAULT 50,
  reviewer_credibility_score numeric DEFAULT 50,
  linguistic_authenticity_score numeric DEFAULT 50,
  contextual_specificity_score numeric DEFAULT 50,
  rating_distribution_integrity_score numeric DEFAULT 50,
  cross_platform_consistency_score numeric DEFAULT 50,
  recency_continuity_quality_score numeric DEFAULT 50,
  top_positive_themes jsonb DEFAULT '[]'::jsonb,
  top_negative_themes jsonb DEFAULT '[]'::jsonb,
  theme_scores jsonb DEFAULT '{}'::jsonb,
  summary_fr text,
  summary_en text,
  confidence_level text DEFAULT 'moderate',
  manual_review_status text DEFAULT 'pending',
  manual_review_notes text,
  authenticity_flags jsonb DEFAULT '[]'::jsonb,
  platform_divergence_score numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rinsi_contractor ON public.review_insights(contractor_id);
ALTER TABLE public.review_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all review insights" ON public.review_insights
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages review insights" ON public.review_insights
  FOR ALL TO service_role USING (true);

-- H) review_theme_taxonomy
CREATE TABLE public.review_theme_taxonomy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_code text UNIQUE NOT NULL,
  family_code text NOT NULL,
  label_fr text NOT NULL,
  label_en text NOT NULL,
  description_fr text,
  description_en text,
  default_weight numeric NOT NULL DEFAULT 1,
  public_visible boolean NOT NULL DEFAULT true,
  matching_relevant boolean NOT NULL DEFAULT true,
  score_dimensions jsonb DEFAULT '[]'::jsonb,
  negative_variant_of text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.review_theme_taxonomy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read review taxonomy" ON public.review_theme_taxonomy
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage review taxonomy" ON public.review_theme_taxonomy
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- I) contractor_review_dimension_scores
CREATE TABLE public.contractor_review_dimension_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  dimension_code text NOT NULL,
  score_raw numeric DEFAULT 0,
  score_weighted numeric DEFAULT 0,
  authenticity_adjusted_score numeric DEFAULT 0,
  mention_count integer DEFAULT 0,
  positive_count integer DEFAULT 0,
  negative_count integer DEFAULT 0,
  confidence_level text DEFAULT 'low',
  summary_fr text,
  summary_en text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crds_contractor ON public.contractor_review_dimension_scores(contractor_id);
ALTER TABLE public.contractor_review_dimension_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage review dimension scores" ON public.contractor_review_dimension_scores
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages review dimension scores" ON public.contractor_review_dimension_scores
  FOR ALL TO service_role USING (true);

-- J) contractor_performance_metrics
CREATE TABLE public.contractor_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  response_time_avg_hours numeric DEFAULT 0,
  appointment_show_rate numeric DEFAULT 0,
  quote_submission_rate numeric DEFAULT 0,
  close_rate numeric DEFAULT 0,
  complaint_rate numeric DEFAULT 0,
  cancellation_rate numeric DEFAULT 0,
  review_sentiment_score numeric DEFAULT 0,
  last_calculated_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_cpm_contractor ON public.contractor_performance_metrics(contractor_id);
ALTER TABLE public.contractor_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors can view own performance" ON public.contractor_performance_metrics
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_performance_metrics.contractor_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Admins can manage all performance metrics" ON public.contractor_performance_metrics
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages performance metrics" ON public.contractor_performance_metrics
  FOR ALL TO service_role USING (true);

-- K) contractor_public_scores
CREATE TABLE public.contractor_public_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  unpro_score numeric DEFAULT 0,
  aipp_score numeric DEFAULT 0,
  trust_score numeric DEFAULT 0,
  visibility_score numeric DEFAULT 0,
  profile_completeness_score numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_cps_contractor ON public.contractor_public_scores(contractor_id);
ALTER TABLE public.contractor_public_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read public scores" ON public.contractor_public_scores
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage public scores" ON public.contractor_public_scores
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages public scores" ON public.contractor_public_scores
  FOR ALL TO service_role USING (true);

-- L) match_evaluations
CREATE TABLE public.match_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  user_id uuid,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  project_fit_score numeric DEFAULT 0,
  property_fit_score numeric DEFAULT 0,
  ccai_score numeric DEFAULT 0,
  dna_fit_score numeric DEFAULT 0,
  raw_review_fit_score numeric DEFAULT 0,
  weighted_review_fit_score numeric DEFAULT 0,
  unpro_score_snapshot numeric DEFAULT 0,
  aipp_score_snapshot numeric DEFAULT 0,
  availability_score numeric DEFAULT 0,
  budget_fit_score numeric DEFAULT 0,
  risk_modifier numeric DEFAULT 0,
  recommendation_score numeric DEFAULT 0,
  success_probability numeric DEFAULT 0,
  conflict_risk_score numeric DEFAULT 0,
  explanations jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_me_user ON public.match_evaluations(user_id);
CREATE INDEX idx_me_contractor ON public.match_evaluations(contractor_id);
CREATE INDEX idx_me_project ON public.match_evaluations(project_id);
CREATE INDEX idx_me_score ON public.match_evaluations(recommendation_score DESC);
ALTER TABLE public.match_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own match evaluations" ON public.match_evaluations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all match evaluations" ON public.match_evaluations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages match evaluations" ON public.match_evaluations
  FOR ALL TO service_role USING (true);

-- M) matching_runs
CREATE TABLE public.matching_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  filters jsonb DEFAULT '{}'::jsonb,
  selected_top_contractors jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mr_user ON public.matching_runs(user_id);
ALTER TABLE public.matching_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own matching runs" ON public.matching_runs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create matching runs" ON public.matching_runs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all matching runs" ON public.matching_runs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_alignment_questions_updated_at BEFORE UPDATE ON public.alignment_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profile_alignment_answers_updated_at BEFORE UPDATE ON public.profile_alignment_answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_homeowner_dna_profiles_updated_at BEFORE UPDATE ON public.homeowner_dna_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_contractor_dna_profiles_updated_at BEFORE UPDATE ON public.contractor_dna_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_review_insights_updated_at BEFORE UPDATE ON public.review_insights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_review_theme_taxonomy_updated_at BEFORE UPDATE ON public.review_theme_taxonomy FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_crds_updated_at BEFORE UPDATE ON public.contractor_review_dimension_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cpm_updated_at BEFORE UPDATE ON public.contractor_performance_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_cps_updated_at BEFORE UPDATE ON public.contractor_public_scores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_me_updated_at BEFORE UPDATE ON public.match_evaluations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public-safe views
CREATE OR REPLACE VIEW public.v_contractor_public_profile AS
SELECT
  c.id,
  c.business_name,
  c.specialty,
  c.city,
  c.province,
  c.rating,
  c.review_count,
  c.verification_status,
  c.logo_url,
  c.years_experience,
  c.portfolio_urls,
  c.description,
  cps.unpro_score,
  cps.aipp_score,
  cps.trust_score,
  cps.visibility_score,
  cps.profile_completeness_score,
  ri.overall_sentiment_score AS review_sentiment,
  ri.confidence_level AS review_confidence,
  ri.top_positive_themes,
  ri.top_negative_themes,
  ri.summary_fr AS review_summary_fr,
  ri.summary_en AS review_summary_en
FROM public.contractors c
LEFT JOIN public.contractor_public_scores cps ON cps.contractor_id = c.id
LEFT JOIN public.review_insights ri ON ri.contractor_id = c.id
WHERE c.verification_status = 'verified';

-- Public-safe match results view (no internal scoring details)
CREATE OR REPLACE VIEW public.v_match_results_safe AS
SELECT
  me.id,
  me.user_id,
  me.project_id,
  me.property_id,
  me.contractor_id,
  me.recommendation_score,
  me.success_probability,
  me.conflict_risk_score,
  me.ccai_score,
  me.dna_fit_score,
  me.project_fit_score,
  me.property_fit_score,
  me.budget_fit_score,
  me.availability_score,
  me.unpro_score_snapshot,
  me.aipp_score_snapshot,
  me.explanations,
  me.created_at,
  c.business_name,
  c.specialty,
  c.city,
  c.province,
  c.logo_url,
  c.rating,
  c.review_count,
  c.verification_status,
  c.years_experience
FROM public.match_evaluations me
JOIN public.contractors c ON c.id = me.contractor_id;

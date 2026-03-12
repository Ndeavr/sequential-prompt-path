
-- Answer Engine tables

CREATE TABLE public.answer_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_pattern TEXT NOT NULL,
  category TEXT NOT NULL,
  property_types TEXT[] DEFAULT '{}',
  short_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  causes JSONB DEFAULT '[]'::jsonb,
  solutions JSONB DEFAULT '[]'::jsonb,
  cost_min INTEGER,
  cost_max INTEGER,
  cost_unit TEXT DEFAULT '$',
  recommended_professionals TEXT[] DEFAULT '{}',
  urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low','medium','high','emergency')),
  preventive_advice JSONB DEFAULT '[]'::jsonb,
  follow_up_question TEXT,
  related_questions JSONB DEFAULT '[]'::jsonb,
  city_context JSONB DEFAULT '{}'::jsonb,
  graph_problem_slug TEXT,
  graph_solution_slugs TEXT[] DEFAULT '{}',
  graph_profession_slugs TEXT[] DEFAULT '{}',
  confidence_base NUMERIC DEFAULT 0.8,
  seo_title TEXT,
  seo_description TEXT,
  is_published BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.answer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer_mode TEXT NOT NULL CHECK (answer_mode IN ('alex','seo','search','diagnostic','api')),
  matched_template_id UUID REFERENCES public.answer_templates(id),
  structured_answer JSONB NOT NULL,
  confidence_score NUMERIC DEFAULT 0,
  property_type TEXT,
  city TEXT,
  user_id UUID,
  session_id UUID,
  response_time_ms INTEGER,
  feedback_rating INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.answer_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_logs ENABLE ROW LEVEL SECURITY;

-- Templates: public read, admin write
CREATE POLICY "Public can read published templates" ON public.answer_templates FOR SELECT TO anon, authenticated USING (is_published = true);
CREATE POLICY "Admins manage answer_templates" ON public.answer_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Logs: admin read all, users read own
CREATE POLICY "Admins read all answer_logs" ON public.answer_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users read own answer_logs" ON public.answer_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Anyone can insert answer_logs" ON public.answer_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TRIGGER set_updated_at_answer_templates BEFORE UPDATE ON public.answer_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

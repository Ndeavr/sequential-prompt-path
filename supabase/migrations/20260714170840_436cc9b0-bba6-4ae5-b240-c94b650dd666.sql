
-- ============ REVIEW INTELLIGENCE™ ============

-- 1) review_requests
CREATE TABLE public.review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL,
  homeowner_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  project_type TEXT,
  city TEXT,
  completion_date DATE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending', -- pending|sent|opened|submitted|published|expired|failed
  sequence_step INT NOT NULL DEFAULT 0,   -- 0 initial, 1 J+3, 2 J+7
  language TEXT NOT NULL DEFAULT 'fr',
  source TEXT NOT NULL DEFAULT 'manual',  -- manual|bulk_csv|appointment_completed
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_review_requests_contractor ON public.review_requests(contractor_id);
CREATE INDEX idx_review_requests_status ON public.review_requests(status);
CREATE INDEX idx_review_requests_token ON public.review_requests(token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_requests TO authenticated;
GRANT SELECT ON public.review_requests TO anon;
GRANT ALL ON public.review_requests TO service_role;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors manage own review requests"
ON public.review_requests FOR ALL TO authenticated
USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()))
WITH CHECK (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

CREATE POLICY "Admins see all review requests"
ON public.review_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read active token requests"
ON public.review_requests FOR SELECT TO anon
USING (expires_at > now() AND status NOT IN ('expired','failed'));

-- 2) reviews_v2
CREATE TABLE public.reviews_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.review_requests(id) ON DELETE SET NULL,
  contractor_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  structured_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  standout_tags TEXT[] NOT NULL DEFAULT '{}',
  raw_text TEXT,
  voice_transcript TEXT,
  ai_generated_text TEXT,
  approved_text TEXT,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  project_type TEXT,
  city TEXT,
  homeowner_name TEXT,
  google_publish_status TEXT NOT NULL DEFAULT 'not_started', -- not_started|opened|copied|clicked|confirmed
  google_click_at TIMESTAMPTZ,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_v2_contractor ON public.reviews_v2(contractor_id);
CREATE INDEX idx_reviews_v2_request ON public.reviews_v2(request_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews_v2 TO authenticated;
GRANT SELECT ON public.reviews_v2 TO anon;
GRANT ALL ON public.reviews_v2 TO service_role;
ALTER TABLE public.reviews_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors see own reviews"
ON public.reviews_v2 FOR SELECT TO authenticated
USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage all reviews"
ON public.reviews_v2 FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read verified reviews"
ON public.reviews_v2 FOR SELECT TO anon
USING (is_verified = true);

-- 3) review_reputation_scores
CREATE TABLE public.review_reputation_scores (
  contractor_id UUID PRIMARY KEY,
  communication NUMERIC(4,2) DEFAULT 0,
  professionalism NUMERIC(4,2) DEFAULT 0,
  cleanliness NUMERIC(4,2) DEFAULT 0,
  trust NUMERIC(4,2) DEFAULT 0,
  quality NUMERIC(4,2) DEFAULT 0,
  education NUMERIC(4,2) DEFAULT 0,
  value NUMERIC(4,2) DEFAULT 0,
  problem_solved NUMERIC(4,2) DEFAULT 0,
  punctuality NUMERIC(4,2) DEFAULT 0,
  ai_visibility_score NUMERIC(5,2) DEFAULT 0,
  sample_size INT NOT NULL DEFAULT 0,
  top_dimensions TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_reputation_scores TO authenticated;
GRANT SELECT ON public.review_reputation_scores TO anon;
GRANT ALL ON public.review_reputation_scores TO service_role;
ALTER TABLE public.review_reputation_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors see own reputation"
ON public.review_reputation_scores FOR SELECT TO authenticated
USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage reputation"
ON public.review_reputation_scores FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read reputation"
ON public.review_reputation_scores FOR SELECT TO anon USING (true);

-- 4) review_request_sequence_jobs
CREATE TABLE public.review_request_sequence_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.review_requests(id) ON DELETE CASCADE,
  run_at TIMESTAMPTZ NOT NULL,
  step INT NOT NULL, -- 1 = J+3, 2 = J+7
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled|sent|skipped|failed
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_review_seq_run_at ON public.review_request_sequence_jobs(run_at) WHERE status = 'scheduled';

GRANT SELECT ON public.review_request_sequence_jobs TO authenticated;
GRANT ALL ON public.review_request_sequence_jobs TO service_role;
ALTER TABLE public.review_request_sequence_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see sequence jobs"
ON public.review_request_sequence_jobs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5) review_media
CREATE TABLE public.review_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.reviews_v2(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'photo', -- photo|video|before|after
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_review_media_review ON public.review_media(review_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_media TO authenticated;
GRANT SELECT ON public.review_media TO anon;
GRANT ALL ON public.review_media TO service_role;
ALTER TABLE public.review_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read verified review media"
ON public.review_media FOR SELECT TO anon USING (true);

CREATE POLICY "Contractors manage own review media"
ON public.review_media FOR ALL TO authenticated
USING (review_id IN (
  SELECT r.id FROM public.reviews_v2 r
  JOIN public.contractors c ON c.id = r.contractor_id
  WHERE c.user_id = auth.uid()
))
WITH CHECK (review_id IN (
  SELECT r.id FROM public.reviews_v2 r
  JOIN public.contractors c ON c.id = r.contractor_id
  WHERE c.user_id = auth.uid()
));

CREATE POLICY "Admins manage all review media"
ON public.review_media FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_review_requests_updated
BEFORE UPDATE ON public.review_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_reviews_v2_updated
BEFORE UPDATE ON public.reviews_v2
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_review_seq_updated
BEFORE UPDATE ON public.review_request_sequence_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

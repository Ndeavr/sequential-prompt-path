
CREATE TABLE public.facebook_extraction_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_url text,
  city text,
  trade_category text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.facebook_extraction_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fb campaigns" ON public.facebook_extraction_campaigns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.facebook_extracted_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.facebook_extraction_campaigns(id) ON DELETE CASCADE,
  raw_comment text,
  commenter_name text,
  commenter_profile_url text,
  company_name text,
  phone text,
  email text,
  city text,
  trade_category text,
  availability_text text,
  confidence_score numeric DEFAULT 0,
  extraction_source text,
  screenshot_url text,
  status text NOT NULL DEFAULT 'extracted',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fb_comments_campaign ON public.facebook_extracted_comments(campaign_id);
CREATE INDEX idx_fb_comments_status ON public.facebook_extracted_comments(status);
ALTER TABLE public.facebook_extracted_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fb comments" ON public.facebook_extracted_comments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.fb_contractor_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'facebook_comment',
  source_comment_id uuid REFERENCES public.facebook_extracted_comments(id) ON DELETE SET NULL,
  company_name text,
  contact_name text,
  phone text,
  email text,
  city text,
  trade_category text,
  rbq_number text,
  neq_number text,
  legal_name text,
  owner_names text[],
  address text,
  website_url text,
  google_business_url text,
  google_rating numeric,
  google_review_count int,
  facebook_url text,
  aipp_score numeric DEFAULT 0,
  enrichment_confidence numeric DEFAULT 0,
  duplicate_key text,
  status text NOT NULL DEFAULT 'new',
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fbcl_status ON public.fb_contractor_leads(status);
CREATE INDEX idx_fbcl_dupkey ON public.fb_contractor_leads(duplicate_key);
CREATE INDEX idx_fbcl_phone ON public.fb_contractor_leads(phone);
CREATE INDEX idx_fbcl_email ON public.fb_contractor_leads(email);
ALTER TABLE public.fb_contractor_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fb contractor leads" ON public.fb_contractor_leads
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_fbcl_updated
  BEFORE UPDATE ON public.fb_contractor_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fb_contractor_lead_enrichment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_lead_id uuid REFERENCES public.fb_contractor_leads(id) ON DELETE CASCADE,
  provider text,
  query text,
  result_json jsonb,
  confidence numeric,
  status text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fbcl_enrich_lead ON public.fb_contractor_lead_enrichment_logs(contractor_lead_id);
ALTER TABLE public.fb_contractor_lead_enrichment_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fbcl enrichment logs" ON public.fb_contractor_lead_enrichment_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.fb_contractor_outreach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_lead_id uuid REFERENCES public.fb_contractor_leads(id) ON DELETE CASCADE,
  channel text,
  subject text,
  body text,
  tone text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fbcl_outreach_lead ON public.fb_contractor_outreach_messages(contractor_lead_id);
ALTER TABLE public.fb_contractor_outreach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage fbcl outreach" ON public.fb_contractor_outreach_messages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO storage.buckets (id, name, public)
VALUES ('facebook-extractions', 'facebook-extractions', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read fb extractions"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'facebook-extractions' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins upload fb extractions"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'facebook-extractions' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete fb extractions"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'facebook-extractions' AND public.has_role(auth.uid(), 'admin'));

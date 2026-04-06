
-- =====================================================
-- OUTBOUND CRM MODULE — Full Schema
-- =====================================================

-- 1. outbound_companies
CREATE TABLE public.outbound_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  company_slug text,
  website_url text,
  city text,
  region text,
  specialty text,
  sub_specialty text,
  language text DEFAULT 'fr',
  rbq_number text,
  google_rating numeric,
  review_count integer DEFAULT 0,
  business_status text DEFAULT 'active',
  legitimacy_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_companies" ON public.outbound_companies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_outbound_companies_city ON public.outbound_companies(city);
CREATE INDEX idx_outbound_companies_specialty ON public.outbound_companies(specialty);

-- 2. outbound_contacts
CREATE TABLE public.outbound_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.outbound_companies(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  full_name text,
  role_title text,
  email text,
  phone text,
  linkedin_url text,
  preferred_language text DEFAULT 'fr',
  is_primary_contact boolean DEFAULT true,
  consent_basis text DEFAULT 'legitimate_interest',
  relevance_reason text,
  email_source_url text,
  source_type text DEFAULT 'manual',
  outreach_eligible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_contacts" ON public.outbound_contacts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_outbound_contacts_company ON public.outbound_contacts(company_id);
CREATE INDEX idx_outbound_contacts_email ON public.outbound_contacts(email);

-- 3. outbound_sequences
CREATE TABLE public.outbound_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_name text NOT NULL,
  sequence_type text DEFAULT 'entrepreneur',
  language text DEFAULT 'fr',
  target_type text DEFAULT 'entrepreneur',
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_sequences" ON public.outbound_sequences FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. outbound_sequence_steps
CREATE TABLE public.outbound_sequence_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id uuid REFERENCES public.outbound_sequences(id) ON DELETE CASCADE NOT NULL,
  step_order integer NOT NULL DEFAULT 1,
  step_name text NOT NULL,
  subject_template text,
  body_template text,
  delay_days integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_sequence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_sequence_steps" ON public.outbound_sequence_steps FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_outbound_seq_steps_seq ON public.outbound_sequence_steps(sequence_id);

-- 5. outbound_mailboxes
CREATE TABLE public.outbound_mailboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  sender_title text,
  signature_html text,
  daily_limit integer DEFAULT 50,
  warmup_enabled boolean DEFAULT false,
  mailbox_status text DEFAULT 'active',
  health_score numeric DEFAULT 100,
  tracking_domain text DEFAULT 'mail.go.unpro.ca',
  reply_to_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_mailboxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_mailboxes" ON public.outbound_mailboxes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. outbound_campaigns
CREATE TABLE public.outbound_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name text NOT NULL,
  city text,
  specialty text,
  campaign_type text DEFAULT 'prospection',
  sequence_id uuid REFERENCES public.outbound_sequences(id),
  mailbox_id uuid REFERENCES public.outbound_mailboxes(id),
  daily_send_limit integer DEFAULT 25,
  campaign_status text DEFAULT 'draft',
  start_date date,
  end_date date,
  priority_index integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_campaigns" ON public.outbound_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_outbound_campaigns_city ON public.outbound_campaigns(city);
CREATE INDEX idx_outbound_campaigns_status ON public.outbound_campaigns(campaign_status);

-- 7. outbound_leads
CREATE TABLE public.outbound_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.outbound_companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.outbound_contacts(id) ON DELETE SET NULL,
  owner_user_id uuid,
  campaign_id uuid REFERENCES public.outbound_campaigns(id) ON DELETE SET NULL,
  crm_status text DEFAULT 'new',
  pipeline_stage text DEFAULT 'new',
  city_priority_score numeric DEFAULT 0,
  specialty_priority_score numeric DEFAULT 0,
  aipp_upside_score numeric DEFAULT 0,
  legitimacy_score numeric DEFAULT 0,
  personalization_score numeric DEFAULT 0,
  outbound_readiness_score numeric DEFAULT 0,
  total_priority_score numeric DEFAULT 0,
  approved_send_order integer,
  hook_summary text,
  last_contacted_at timestamptz,
  replied_at timestamptz,
  bounced_at timestamptz,
  unsubscribed_at timestamptz,
  booked_at timestamptz,
  converted_at timestamptz,
  closed_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_leads" ON public.outbound_leads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_outbound_leads_campaign ON public.outbound_leads(campaign_id);
CREATE INDEX idx_outbound_leads_status ON public.outbound_leads(crm_status);
CREATE INDEX idx_outbound_leads_company ON public.outbound_leads(company_id);
CREATE INDEX idx_outbound_leads_priority ON public.outbound_leads(total_priority_score DESC);

-- 8. outbound_messages
CREATE TABLE public.outbound_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.outbound_leads(id) ON DELETE CASCADE NOT NULL,
  campaign_id uuid REFERENCES public.outbound_campaigns(id),
  mailbox_id uuid REFERENCES public.outbound_mailboxes(id),
  sequence_step_id uuid REFERENCES public.outbound_sequence_steps(id),
  provider_message_id text,
  subject_rendered text,
  body_rendered text,
  sent_at timestamptz,
  delivery_status text DEFAULT 'queued',
  open_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  replied boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_messages" ON public.outbound_messages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_outbound_messages_lead ON public.outbound_messages(lead_id);
CREATE INDEX idx_outbound_messages_campaign ON public.outbound_messages(campaign_id);

-- 9. outbound_events
CREATE TABLE public.outbound_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.outbound_leads(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.outbound_campaigns(id),
  message_id uuid REFERENCES public.outbound_messages(id),
  event_type text NOT NULL,
  event_value text,
  event_payload jsonb,
  event_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_events" ON public.outbound_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_outbound_events_lead ON public.outbound_events(lead_id);
CREATE INDEX idx_outbound_events_type ON public.outbound_events(event_type);

-- 10. outbound_replies
CREATE TABLE public.outbound_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.outbound_leads(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.outbound_campaigns(id),
  message_id uuid REFERENCES public.outbound_messages(id),
  reply_subject text,
  reply_body text,
  reply_sentiment text DEFAULT 'neutral',
  reply_intent text,
  suggested_crm_status text,
  assigned_to uuid,
  handled boolean DEFAULT false,
  handled_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_replies" ON public.outbound_replies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_outbound_replies_lead ON public.outbound_replies(lead_id);

-- 11. outbound_suppressions
CREATE TABLE public.outbound_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  domain text,
  company_id uuid REFERENCES public.outbound_companies(id),
  suppression_type text NOT NULL,
  suppression_reason text,
  source text DEFAULT 'system',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_suppressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_suppressions" ON public.outbound_suppressions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_outbound_suppressions_email ON public.outbound_suppressions(email);

-- 12. outbound_mailbox_warmup
CREATE TABLE public.outbound_mailbox_warmup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id uuid REFERENCES public.outbound_mailboxes(id) ON DELETE CASCADE NOT NULL,
  day_number integer NOT NULL,
  target_sends integer DEFAULT 5,
  actual_sends integer DEFAULT 0,
  bounce_count integer DEFAULT 0,
  warmup_date date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_mailbox_warmup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_mailbox_warmup" ON public.outbound_mailbox_warmup FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 13. outbound_landing_pages
CREATE TABLE public.outbound_landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.outbound_companies(id),
  lead_id uuid REFERENCES public.outbound_leads(id),
  page_slug text NOT NULL,
  page_url text,
  city text,
  specialty text,
  language text DEFAULT 'fr',
  hero_title text,
  hero_subtitle text,
  aipp_summary text,
  strengths_json jsonb,
  missing_elements_json jsonb,
  cta_primary text DEFAULT 'Planifier un rendez-vous',
  cta_secondary text DEFAULT 'En savoir plus',
  page_status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_landing_pages" ON public.outbound_landing_pages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_outbound_lp_slug ON public.outbound_landing_pages(page_slug);

-- 14. outbound_ai_scores
CREATE TABLE public.outbound_ai_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.outbound_leads(id) ON DELETE CASCADE NOT NULL,
  scoring_version text DEFAULT 'v1',
  score_json jsonb,
  reasoning_summary text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_ai_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_ai_scores" ON public.outbound_ai_scores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 15. outbound_ai_personalizations
CREATE TABLE public.outbound_ai_personalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.outbound_leads(id) ON DELETE CASCADE NOT NULL,
  personalization_type text DEFAULT 'hook',
  prompt_used text,
  generated_output text,
  approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_ai_personalizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_ai_personalizations" ON public.outbound_ai_personalizations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 16. outbound_notes
CREATE TABLE public.outbound_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.outbound_leads(id) ON DELETE CASCADE NOT NULL,
  author_user_id uuid,
  note_type text DEFAULT 'general',
  note_content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_notes" ON public.outbound_notes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 17. outbound_tasks
CREATE TABLE public.outbound_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.outbound_leads(id) ON DELETE CASCADE NOT NULL,
  assigned_to uuid,
  task_title text NOT NULL,
  task_status text DEFAULT 'pending',
  due_at timestamptz,
  priority text DEFAULT 'medium',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_tasks" ON public.outbound_tasks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 18. outbound_tags
CREATE TABLE public.outbound_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_name text NOT NULL UNIQUE,
  tag_color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_tags" ON public.outbound_tags FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 19. outbound_lead_tags
CREATE TABLE public.outbound_lead_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.outbound_leads(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES public.outbound_tags(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, tag_id)
);
ALTER TABLE public.outbound_lead_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_lead_tags" ON public.outbound_lead_tags FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 20. outbound_delivery_metrics
CREATE TABLE public.outbound_delivery_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mailbox_id uuid REFERENCES public.outbound_mailboxes(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  sent_count integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  bounced_count integer DEFAULT 0,
  opened_count integer DEFAULT 0,
  clicked_count integer DEFAULT 0,
  replied_count integer DEFAULT 0,
  unsubscribed_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.outbound_delivery_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access outbound_delivery_metrics" ON public.outbound_delivery_metrics FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_outbound_dm_mailbox_date ON public.outbound_delivery_metrics(mailbox_id, metric_date);

-- Updated_at triggers
CREATE TRIGGER set_outbound_companies_updated_at BEFORE UPDATE ON public.outbound_companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_outbound_contacts_updated_at BEFORE UPDATE ON public.outbound_contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_outbound_sequences_updated_at BEFORE UPDATE ON public.outbound_sequences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_outbound_sequence_steps_updated_at BEFORE UPDATE ON public.outbound_sequence_steps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_outbound_mailboxes_updated_at BEFORE UPDATE ON public.outbound_mailboxes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_outbound_campaigns_updated_at BEFORE UPDATE ON public.outbound_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_outbound_leads_updated_at BEFORE UPDATE ON public.outbound_leads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_outbound_messages_updated_at BEFORE UPDATE ON public.outbound_messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_outbound_suppressions_updated_at BEFORE UPDATE ON public.outbound_suppressions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_outbound_landing_pages_updated_at BEFORE UPDATE ON public.outbound_landing_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_outbound_ai_personalizations_updated_at BEFORE UPDATE ON public.outbound_ai_personalizations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_outbound_tasks_updated_at BEFORE UPDATE ON public.outbound_tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

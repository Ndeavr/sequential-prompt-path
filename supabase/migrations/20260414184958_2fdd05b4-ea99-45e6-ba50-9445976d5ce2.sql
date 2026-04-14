
-- Email Audit Runs
CREATE TABLE public.email_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key text DEFAULT 'default',
  environment text DEFAULT 'development',
  status text NOT NULL DEFAULT 'queued',
  score_percent integer DEFAULT 0,
  total_checks integer DEFAULT 0,
  passed_count integer DEFAULT 0,
  warning_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  blocking_count integer DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  triggered_by uuid,
  summary_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_audit_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage audit runs" ON public.email_audit_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Email Audit Checks
CREATE TABLE public.email_audit_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.email_audit_runs(id) ON DELETE CASCADE,
  check_code text NOT NULL,
  check_label text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  execution_status text NOT NULL DEFAULT 'pending',
  severity_level text NOT NULL DEFAULT 'medium',
  passed_boolean boolean DEFAULT false,
  blocking_boolean boolean DEFAULT false,
  result_value text,
  message text,
  recommendation text,
  details_json jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 0,
  executed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_audit_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage audit checks" ON public.email_audit_checks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_audit_checks_run_id ON public.email_audit_checks(run_id);

-- Email Test Messages
CREATE TABLE public.email_test_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_run_id uuid REFERENCES public.email_audit_runs(id) ON DELETE SET NULL,
  provider_key text DEFAULT 'default',
  environment text DEFAULT 'development',
  sender_email text,
  reply_to_email text,
  recipient_email text NOT NULL,
  subject text,
  body_preview text,
  provider_message_id text,
  send_status text DEFAULT 'pending',
  delivery_status text DEFAULT 'unknown',
  last_event text,
  accepted_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  rejected_at timestamptz,
  complained_at timestamptz,
  error_code text,
  error_message text,
  raw_response_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_test_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage test messages" ON public.email_test_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Audit Action Recommendations (seed data for actionable fixes)
CREATE TABLE public.audit_action_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_code text NOT NULL,
  execution_status text NOT NULL DEFAULT 'failed',
  severity_level text NOT NULL DEFAULT 'high',
  action_title text NOT NULL,
  action_description text NOT NULL,
  action_priority integer DEFAULT 1,
  docs_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_action_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read recommendations" ON public.audit_action_recommendations FOR SELECT TO authenticated USING (true);

-- Seed recommendations
INSERT INTO public.audit_action_recommendations (check_code, execution_status, severity_level, action_title, action_description, action_priority) VALUES
('check_provider_connected', 'failed', 'critical', 'Connecter un provider email', 'Aucun provider email n''est configuré. Configurez Resend, SendGrid ou un autre provider SMTP dans les paramètres.', 1),
('check_sender_address_authorized', 'failed', 'critical', 'Autoriser l''adresse expéditrice', 'L''adresse d''envoi n''est pas vérifiée auprès du provider. Ajoutez et confirmez l''adresse dans le tableau de bord du provider.', 2),
('check_sender_address_authorized', 'blocking', 'critical', 'Adresse expéditrice bloquante', 'L''envoi est impossible tant que l''adresse expéditrice n''est pas autorisée. Vérifiez-la immédiatement.', 1),
('check_dkim_valid', 'failed', 'high', 'Configurer DKIM', 'La signature DKIM est absente ou invalide. Ajoutez les enregistrements DKIM DNS fournis par votre provider.', 3),
('check_spf_valid', 'failed', 'high', 'Configurer SPF', 'L''enregistrement SPF est manquant ou incorrect. Ajoutez l''entrée SPF DNS requise par votre provider.', 3),
('check_dmarc_policy_present', 'failed', 'high', 'Ajouter une policy DMARC', 'Aucune policy DMARC détectée. Ajoutez un enregistrement _dmarc TXT pour protéger votre domaine.', 4),
('check_dmarc_policy_strength', 'warning', 'medium', 'Renforcer la policy DMARC', 'La policy DMARC est définie sur p=none. Passez à p=quarantine ou p=reject après validation.', 5),
('check_webhooks_configured', 'failed', 'high', 'Configurer les webhooks email', 'Les webhooks de suivi (delivered, bounced, complained) ne sont pas connectés. Configurez-les dans le provider.', 4),
('check_reply_to_configured', 'warning', 'low', 'Configurer Reply-To', 'Aucune adresse Reply-To n''est définie. Ajoutez-en une pour recevoir les réponses des destinataires.', 6),
('check_daily_limit_configured', 'warning', 'medium', 'Définir la limite quotidienne', 'La limite d''envoi journalière n''est pas configurée. Définissez-la pour éviter les dépassements.', 5),
('check_bounce_rate_threshold', 'failed', 'high', 'Taux de rebond trop élevé', 'Le taux de rebond dépasse le seuil acceptable. Nettoyez votre liste de destinataires et vérifiez les adresses.', 2);

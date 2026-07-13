
-- 1) SMS templates for First Dollar sprint
CREATE TABLE public.sms_templates_first_dollar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code IN ('A','B','C')),
  body text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sms_templates_first_dollar TO authenticated;
GRANT ALL ON public.sms_templates_first_dollar TO service_role;
ALTER TABLE public.sms_templates_first_dollar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sms templates" ON public.sms_templates_first_dollar
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Authenticated read active templates" ON public.sms_templates_first_dollar
  FOR SELECT TO authenticated USING (active = true);

INSERT INTO public.sms_templates_first_dollar (code, body) VALUES
('A', 'Bonjour [FIRSTNAME],

Votre entreprise a été identifiée comme pouvant être recommandée aux propriétaires de votre secteur.

Vérifiez votre profil gratuitement :

[LINK]

Activation d''essai : 1 $

UNPRO'),
('B', '[FIRSTNAME],

Votre entreprise mérite-t-elle d''être recommandée ?

UNPRO analyse expertise, territoire et réputation.

Voir votre profil :

[LINK]

Essai 7 jours : 1 $'),
('C', '[FIRSTNAME],

Des propriétaires recherchent actuellement un entrepreneur dans votre catégorie.

Vérifiez si votre entreprise est admissible aux recommandations UNPRO.

[LINK]');

-- 2) SMS batches
CREATE TABLE public.sms_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  size int NOT NULL DEFAULT 25 CHECK (size BETWEEN 1 AND 100),
  lead_ids uuid[] NOT NULL DEFAULT '{}',
  template_distribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_count int NOT NULL DEFAULT 0,
  delivered_count int NOT NULL DEFAULT 0,
  clicked_count int NOT NULL DEFAULT 0,
  converted_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','reviewed')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  notes text
);
GRANT SELECT, INSERT, UPDATE ON public.sms_batches TO authenticated;
GRANT ALL ON public.sms_batches TO service_role;
ALTER TABLE public.sms_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage batches" ON public.sms_batches
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 3) Daily reports
CREATE TABLE public.first_dollar_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL UNIQUE,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  top_dropoff text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.first_dollar_daily_reports TO authenticated;
GRANT ALL ON public.first_dollar_daily_reports TO service_role;
ALTER TABLE public.first_dollar_daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read daily reports" ON public.first_dollar_daily_reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 4) Add template_code to launch_leads (if not exists)
ALTER TABLE public.launch_leads
  ADD COLUMN IF NOT EXISTS template_code text CHECK (template_code IN ('A','B','C')),
  ADD COLUMN IF NOT EXISTS sms_batch_id uuid REFERENCES public.sms_batches(id) ON DELETE SET NULL;

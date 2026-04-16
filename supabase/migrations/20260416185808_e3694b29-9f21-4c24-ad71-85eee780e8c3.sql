-- ============= CALENDAR CONNECTION & CONVERSION ENGINE =============

-- 1. calendar_connections
CREATE TABLE IF NOT EXISTS public.calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple', 'outlook')),
  provider_account_email TEXT,
  connection_status TEXT NOT NULL DEFAULT 'idle'
    CHECK (connection_status IN ('idle','connecting','connected','subscribed_external','failed','revoked')),
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  ics_token TEXT UNIQUE,
  scopes_json JSONB DEFAULT '[]'::jsonb,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  connected_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  last_error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_user ON public.calendar_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_connections_status ON public.calendar_connections(connection_status);

-- 2. calendar_sync_logs
CREATE TABLE IF NOT EXISTS public.calendar_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_connection_id UUID NOT NULL REFERENCES public.calendar_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL DEFAULT 'manual',
  sync_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending','success','error')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  records_imported INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_conn ON public.calendar_sync_logs(calendar_connection_id);

-- 3. calendar_conversion_events
CREATE TABLE IF NOT EXISTS public.calendar_conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id TEXT,
  role_context TEXT NOT NULL DEFAULT 'guest',
  surface TEXT NOT NULL,
  prompt_variant TEXT,
  provider TEXT,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'prompt_viewed','prompt_dismissed','connect_clicked',
      'oauth_started','oauth_succeeded','oauth_failed',
      'apple_subscribe_clicked','calendar_connected',
      'calendar_disconnected','sync_triggered'
    )),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_calendar_conv_events_user ON public.calendar_conversion_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_conv_events_type ON public.calendar_conversion_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_conv_events_surface ON public.calendar_conversion_events(surface);

-- 4. calendar_connection_prompts (seed copy)
CREATE TABLE IF NOT EXISTS public.calendar_connection_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_type TEXT NOT NULL CHECK (role_type IN ('homeowner','contractor','professional','admin','guest')),
  surface TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr','en')),
  headline TEXT NOT NULL,
  subtext TEXT NOT NULL,
  primary_cta TEXT NOT NULL,
  secondary_cta TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_calendar_prompts_role ON public.calendar_connection_prompts(role_type, surface, language);

-- 5. calendar_connection_nudges
CREATE TABLE IF NOT EXISTS public.calendar_connection_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_context TEXT NOT NULL DEFAULT 'homeowner',
  surface TEXT NOT NULL,
  nudge_status TEXT NOT NULL DEFAULT 'eligible'
    CHECK (nudge_status IN ('eligible','shown','dismissed','accepted','paused')),
  last_shown_at TIMESTAMPTZ,
  dismiss_count INTEGER NOT NULL DEFAULT 0,
  accept_count INTEGER NOT NULL DEFAULT 0,
  next_eligible_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, surface)
);
CREATE INDEX IF NOT EXISTS idx_calendar_nudges_user ON public.calendar_connection_nudges(user_id);

-- ============= TRIGGERS for updated_at =============
CREATE TRIGGER trg_calendar_connections_updated
  BEFORE UPDATE ON public.calendar_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_calendar_nudges_updated
  BEFORE UPDATE ON public.calendar_connection_nudges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= RLS =============
ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_connection_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_connection_nudges ENABLE ROW LEVEL SECURITY;

-- calendar_connections — only owner can SELECT (no token exposure ever); writes via edge functions only
CREATE POLICY "users_view_own_calendar_connections"
  ON public.calendar_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_delete_own_calendar_connections"
  ON public.calendar_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admins_view_all_calendar_connections"
  ON public.calendar_connections FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- calendar_sync_logs — owner via join + admins
CREATE POLICY "users_view_own_calendar_sync_logs"
  ON public.calendar_sync_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_connections c
      WHERE c.id = calendar_sync_logs.calendar_connection_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "admins_view_all_calendar_sync_logs"
  ON public.calendar_sync_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- calendar_conversion_events — anyone can insert their own event (analytics), only admin reads global
CREATE POLICY "anyone_insert_calendar_conversion_events"
  ON public.calendar_conversion_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "users_view_own_calendar_conversion_events"
  ON public.calendar_conversion_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admins_view_all_calendar_conversion_events"
  ON public.calendar_conversion_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- calendar_connection_prompts — public read (UI copy), admin manage
CREATE POLICY "anyone_view_active_calendar_prompts"
  ON public.calendar_connection_prompts FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "admins_manage_calendar_prompts"
  ON public.calendar_connection_prompts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- calendar_connection_nudges — owner manage, admin view
CREATE POLICY "users_manage_own_calendar_nudges"
  ON public.calendar_connection_nudges FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins_view_all_calendar_nudges"
  ON public.calendar_connection_nudges FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============= SEED COPY =============
INSERT INTO public.calendar_connection_prompts (role_type, surface, language, headline, subtext, primary_cta, secondary_cta, sort_order) VALUES
-- Homeowner FR
('homeowner','dashboard','fr','Connectez votre calendrier pour des rendez-vous qui marchent vraiment','On vérifie seulement votre disponibilité. Rien n''est réservé sans votre accord.','Connecter mon calendrier','Plus tard',1),
('homeowner','onboarding','fr','Connectez votre calendrier pour des rendez-vous qui marchent vraiment','On vérifie seulement votre disponibilité. Rien n''est réservé sans votre accord.','Connecter mon calendrier','Plus tard',1),
('homeowner','account','fr','Connectez votre calendrier','Synchronisez Google ou Apple Calendar pour des suggestions parfaitement adaptées.','Connecter mon calendrier','Plus tard',1),
('homeowner','alex','fr','Je peux te proposer des heures qui marchent vraiment','Connecte ton calendrier — pas d''aller-retour, pas de conflit.','Connecter mon calendrier','Plus tard',1),
-- Homeowner EN
('homeowner','dashboard','en','Connect your calendar so I can suggest times that actually work','We only check your availability. Nothing is booked without your approval.','Connect my calendar','Maybe later',1),
('homeowner','onboarding','en','Connect your calendar so I can suggest times that actually work','We only check your availability. Nothing is booked without your approval.','Connect my calendar','Maybe later',1),
('homeowner','account','en','Connect your calendar','Sync Google or Apple Calendar for perfectly tailored suggestions.','Connect my calendar','Maybe later',1),
('homeowner','alex','en','I can suggest times that actually work for you','Connect your calendar — no back-and-forth, no conflicts.','Connect my calendar','Maybe later',1),
-- Contractor FR
('contractor','dashboard','fr','Recevez seulement des rendez-vous compatibles avec votre vrai horaire','UNPRO bloque vos chantiers en cours et insère uniquement des rendez-vous qualifiés.','Connecter Google Calendar','S''abonner avec Apple Calendar',1),
('contractor','onboarding','fr','Activez vos rendez-vous : connectez votre calendrier','Vos chantiers sont respectés. Seuls les bons rendez-vous arrivent.','Connecter Google Calendar','S''abonner avec Apple Calendar',1),
('contractor','account','fr','Connectez votre calendrier professionnel','Recevez les rendez-vous au bon moment, sans conflit.','Connecter Google Calendar','S''abonner avec Apple Calendar',1),
('contractor','alex','fr','Connecte ton calendrier et je remplis ton horaire entre tes chantiers','Aucun rendez-vous mal placé. Seulement ce qui fitte ta vraie disponibilité.','Connecter Google Calendar','S''abonner avec Apple Calendar',1),
-- Contractor EN
('contractor','dashboard','en','Receive only appointments that fit your real schedule','UNPRO blocks your busy jobs and inserts only qualified appointments.','Connect Google Calendar','Subscribe with Apple Calendar',1),
('contractor','onboarding','en','Activate your appointments: connect your calendar','Your jobs are respected. Only the right appointments come in.','Connect Google Calendar','Subscribe with Apple Calendar',1),
('contractor','account','en','Connect your professional calendar','Receive appointments at the right time, with no conflicts.','Connect Google Calendar','Subscribe with Apple Calendar',1),
('contractor','alex','en','Connect your calendar and I''ll fill your day between your jobs','No misplaced appointments. Only what fits your real availability.','Connect Google Calendar','Subscribe with Apple Calendar',1),
-- Professional FR
('professional','dashboard','fr','Recevez des rendez-vous parfaitement timés','On planifie les clients seulement quand vous êtes vraiment disponible.','Synchroniser mon calendrier','Plus tard',1),
('professional','account','fr','Connectez votre calendrier','Pour que vos rendez-vous client tombent au bon moment.','Synchroniser mon calendrier','Plus tard',1),
-- Professional EN
('professional','dashboard','en','Receive perfectly timed client appointments','We schedule clients only when you are truly available.','Sync my calendar','Maybe later',1),
('professional','account','en','Connect your calendar','So your client appointments land at the right time.','Sync my calendar','Maybe later',1)
ON CONFLICT DO NOTHING;
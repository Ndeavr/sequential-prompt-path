
-- conversation_sessions
CREATE TABLE IF NOT EXISTS public.conversation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_token text,
  session_status text NOT NULL DEFAULT 'active',
  entry_point text DEFAULT 'home',
  locale text DEFAULT 'fr',
  device_type text DEFAULT 'mobile',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversation_sessions' AND policyname='Users read own conv sessions') THEN
    CREATE POLICY "Users read own conv sessions" ON public.conversation_sessions FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversation_sessions' AND policyname='Users create own conv sessions') THEN
    CREATE POLICY "Users create own conv sessions" ON public.conversation_sessions FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversation_sessions' AND policyname='Users update own conv sessions') THEN
    CREATE POLICY "Users update own conv sessions" ON public.conversation_sessions FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversation_sessions' AND policyname='Admin read all conv sessions') THEN
    CREATE POLICY "Admin read all conv sessions" ON public.conversation_sessions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- conversation_events
CREATE TABLE IF NOT EXISTS public.conversation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversation_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversation_events' AND policyname='Users manage own conv events') THEN
    CREATE POLICY "Users manage own conv events" ON public.conversation_events FOR ALL USING (
      EXISTS (SELECT 1 FROM public.conversation_sessions cs WHERE cs.id = session_id AND cs.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversation_events' AND policyname='Admin read all conv events') THEN
    CREATE POLICY "Admin read all conv events" ON public.conversation_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- conversation_context_signals
CREATE TABLE IF NOT EXISTS public.conversation_context_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  signal_key text NOT NULL,
  signal_value_text text,
  signal_value_json jsonb,
  confidence_score numeric DEFAULT 0.5,
  source text NOT NULL DEFAULT 'user_input',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversation_context_signals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversation_context_signals' AND policyname='Users manage own context signals') THEN
    CREATE POLICY "Users manage own context signals" ON public.conversation_context_signals FOR ALL USING (
      EXISTS (SELECT 1 FROM public.conversation_sessions cs WHERE cs.id = session_id AND cs.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversation_context_signals' AND policyname='Admin read all context signals') THEN
    CREATE POLICY "Admin read all context signals" ON public.conversation_context_signals FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- entrepreneur_recommendations
CREATE TABLE IF NOT EXISTS public.entrepreneur_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  recommendation_rank integer NOT NULL DEFAULT 1,
  recommendation_reason text,
  score_total numeric DEFAULT 0,
  score_match numeric DEFAULT 0,
  score_geo numeric DEFAULT 0,
  score_availability numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'shown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.entrepreneur_recommendations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='entrepreneur_recommendations' AND policyname='Users read own recommendations') THEN
    CREATE POLICY "Users read own recommendations" ON public.entrepreneur_recommendations FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.conversation_sessions cs WHERE cs.id = session_id AND cs.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='entrepreneur_recommendations' AND policyname='Admin read all recommendations') THEN
    CREATE POLICY "Admin read all recommendations" ON public.entrepreneur_recommendations FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- booking_slot_snapshots
CREATE TABLE IF NOT EXISTS public.booking_slot_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  slot_start timestamptz NOT NULL,
  slot_end timestamptz NOT NULL,
  slot_label text,
  slot_status text NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.booking_slot_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='booking_slot_snapshots' AND policyname='Users read own booking slots') THEN
    CREATE POLICY "Users read own booking slots" ON public.booking_slot_snapshots FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.conversation_sessions cs WHERE cs.id = session_id AND cs.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='booking_slot_snapshots' AND policyname='Admin read all booking slots') THEN
    CREATE POLICY "Admin read all booking slots" ON public.booking_slot_snapshots FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- conversation_ui_cards
CREATE TABLE IF NOT EXISTS public.conversation_ui_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.conversation_sessions(id) ON DELETE CASCADE,
  card_type text NOT NULL,
  card_payload jsonb DEFAULT '{}'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  interaction_status text NOT NULL DEFAULT 'rendered',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversation_ui_cards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversation_ui_cards' AND policyname='Users manage own ui cards') THEN
    CREATE POLICY "Users manage own ui cards" ON public.conversation_ui_cards FOR ALL USING (
      EXISTS (SELECT 1 FROM public.conversation_sessions cs WHERE cs.id = session_id AND cs.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='conversation_ui_cards' AND policyname='Admin read all ui cards') THEN
    CREATE POLICY "Admin read all ui cards" ON public.conversation_ui_cards FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- voice_preferences
CREATE TABLE IF NOT EXISTS public.voice_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  language_code text DEFAULT 'fr',
  voice_id text,
  speed_rate numeric DEFAULT 1.0,
  accent_profile text DEFAULT 'neutral',
  autoplay_enabled boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.voice_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='voice_preferences' AND policyname='Users manage own voice prefs') THEN
    CREATE POLICY "Users manage own voice prefs" ON public.voice_preferences FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='voice_preferences' AND policyname='Admin read all voice prefs') THEN
    CREATE POLICY "Admin read all voice prefs" ON public.voice_preferences FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conv_sessions_user ON public.conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_events_session ON public.conversation_events(session_id);
CREATE INDEX IF NOT EXISTS idx_conv_signals_session ON public.conversation_context_signals(session_id);
CREATE INDEX IF NOT EXISTS idx_entrepreneur_recs_session ON public.entrepreneur_recommendations(session_id);
CREATE INDEX IF NOT EXISTS idx_booking_snapshots_session ON public.booking_slot_snapshots(session_id);
CREATE INDEX IF NOT EXISTS idx_conv_ui_cards_session ON public.conversation_ui_cards(session_id);

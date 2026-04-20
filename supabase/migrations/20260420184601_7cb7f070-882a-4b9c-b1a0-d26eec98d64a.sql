-- 1. Create system_environment_state table (single-row config)
CREATE TABLE IF NOT EXISTS public.system_environment_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode text NOT NULL DEFAULT 'test' CHECK (mode IN ('test', 'live')),
  activated_at timestamptz,
  activated_by uuid,
  kill_switch_active boolean NOT NULL DEFAULT false,
  paused_at timestamptz,
  paused_by uuid,
  live_requires_approval boolean NOT NULL DEFAULT true,
  notes text,
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed the single row
INSERT INTO public.system_environment_state (mode, kill_switch_active, live_requires_approval, notes)
VALUES ('test', false, true, 'Initial state — TEST mode, no real sends')
ON CONFLICT (singleton) DO NOTHING;

-- 2. Enable RLS
ALTER TABLE public.system_environment_state ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies — admin only
CREATE POLICY "Admins can view system environment state"
ON public.system_environment_state
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update system environment state"
ON public.system_environment_state
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Updated_at trigger
CREATE TRIGGER update_system_environment_state_updated_at
BEFORE UPDATE ON public.system_environment_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Helper function used by edge functions to gate real sends
CREATE OR REPLACE FUNCTION public.is_system_live()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT mode = 'live' AND kill_switch_active = false
     FROM public.system_environment_state
     LIMIT 1),
    false
  );
$$;

-- 6. Audit trigger — log every mode change to system_events
CREATE OR REPLACE FUNCTION public.log_system_mode_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.mode IS DISTINCT FROM NEW.mode) THEN
    INSERT INTO public.system_events (event_type, severity, payload)
    VALUES (
      'system_mode_changed',
      CASE WHEN NEW.mode = 'live' THEN 'critical' ELSE 'info' END,
      jsonb_build_object(
        'from_mode', OLD.mode,
        'to_mode', NEW.mode,
        'activated_by', NEW.activated_by,
        'notes', NEW.notes
      )
    );
  END IF;

  IF (OLD.kill_switch_active IS DISTINCT FROM NEW.kill_switch_active) THEN
    INSERT INTO public.system_events (event_type, severity, payload)
    VALUES (
      CASE WHEN NEW.kill_switch_active THEN 'kill_switch_activated' ELSE 'kill_switch_released' END,
      CASE WHEN NEW.kill_switch_active THEN 'critical' ELSE 'warning' END,
      jsonb_build_object(
        'paused_by', NEW.paused_by,
        'mode', NEW.mode,
        'notes', NEW.notes
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_system_mode_change
AFTER UPDATE ON public.system_environment_state
FOR EACH ROW
EXECUTE FUNCTION public.log_system_mode_change();
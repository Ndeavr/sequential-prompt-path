CREATE OR REPLACE FUNCTION public.tg_seed_onboarding_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.contractor_onboarding_states(contractor_id, state, next_action_at)
  VALUES (NEW.id, 'SCRAPED', now())
  ON CONFLICT (contractor_id) DO NOTHING;
  INSERT INTO public.contractor_onboarding_events(contractor_id, from_state, to_state, actor, metadata)
  VALUES (NEW.id, NULL, 'SCRAPED', 'system',
          jsonb_build_object('source', COALESCE(NEW.source_type, NEW.source_label, 'unknown')));
  RETURN NEW;
END $function$;
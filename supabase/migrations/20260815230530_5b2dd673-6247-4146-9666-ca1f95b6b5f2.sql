INSERT INTO public.provider_circuit_state (provider, kill_switch)
VALUES ('dataforseo', true)
ON CONFLICT (provider) DO UPDATE SET kill_switch = true;
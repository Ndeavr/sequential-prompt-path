UPDATE public.recruitment_controls
SET global_enabled = false,
    autonomous_enqueue_enabled = false,
    max_daily_global = 25,
    max_daily_per_channel = 25,
    max_daily_per_city_category = 10,
    notes = 'Test live contrôlé Laval x plombier limit 1 réussi (SID SM3797d2b65797c90c146ebd03c8ec6ec6) — 2026-07-30. Contrôles refermés.',
    updated_at = now();
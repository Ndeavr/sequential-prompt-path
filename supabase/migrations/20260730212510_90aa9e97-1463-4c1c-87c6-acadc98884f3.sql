UPDATE public.recruitment_controls
SET global_enabled = true,
    autonomous_enqueue_enabled = false,
    max_daily_global = 1,
    max_daily_per_channel = 1,
    max_daily_per_city_category = 1,
    notes = 'Controlled live test Laval x plombier limit 1 — 2026-07-30',
    updated_at = now();
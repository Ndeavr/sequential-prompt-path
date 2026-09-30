SELECT cron.alter_job(142, active := false);
UPDATE public.system_flags SET value = true, updated_at = now() WHERE key = 'OUTREACH_ENABLED';
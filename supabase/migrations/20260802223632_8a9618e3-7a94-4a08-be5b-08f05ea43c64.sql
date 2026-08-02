CREATE UNIQUE INDEX IF NOT EXISTS pipeline_engagement_events_idempotency_key_uidx
  ON public.pipeline_engagement_events (idempotency_key);
ALTER TABLE public.property_events
  ADD COLUMN IF NOT EXISTS provenance TEXT NOT NULL DEFAULT 'declared';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'property_events_provenance_check'
  ) THEN
    ALTER TABLE public.property_events
      ADD CONSTRAINT property_events_provenance_check
      CHECK (provenance IN ('verified','declared','inferred','unconfirmed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_property_events_property_date
  ON public.property_events (property_id, event_date DESC);

ALTER TABLE public.contractor_generation_targets
  ALTER COLUMN primary_activity_id DROP NOT NULL;

ALTER TABLE public.contractor_generation_targets
  ALTER COLUMN secondary_activity_id DROP NOT NULL;

ALTER TABLE public.contractor_matching_profiles
  ADD COLUMN IF NOT EXISTS current_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS audit_contractor_id uuid;

CREATE INDEX IF NOT EXISTS contractor_matching_profiles_audit_id_idx
  ON public.contractor_matching_profiles (audit_id, updated_at DESC)
  WHERE audit_id IS NOT NULL;
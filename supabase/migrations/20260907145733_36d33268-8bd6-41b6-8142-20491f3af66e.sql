ALTER TABLE public.founder_memberships ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.founder_memberships
  ADD CONSTRAINT founder_memberships_contact_present
  CHECK (email IS NOT NULL OR phone IS NOT NULL OR user_id IS NOT NULL OR prospect_id IS NOT NULL) NOT VALID;
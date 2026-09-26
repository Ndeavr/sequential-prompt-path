ALTER TABLE public.contractors
  ADD COLUMN IF NOT EXISTS public_status text GENERATED ALWAYS AS (
    CASE
      WHEN COALESCE(is_published,false) = false THEN 'unpublished'
      WHEN verification_status = 'verified' AND COALESCE(admin_verified,false) = true THEN 'verified_active'
      ELSE 'published_pending_verification'
    END
  ) STORED;
CREATE INDEX IF NOT EXISTS idx_contractors_public_status ON public.contractors(public_status);
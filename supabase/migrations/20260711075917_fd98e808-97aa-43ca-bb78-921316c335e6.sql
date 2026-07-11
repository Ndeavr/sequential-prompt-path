
DO $$ BEGIN
  CREATE TYPE public.contractor_rbq_status AS ENUM ('verified','in_progress','not_provided','expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.contractors
  ADD COLUMN IF NOT EXISTS rbq_compliance_status public.contractor_rbq_status NOT NULL DEFAULT 'not_provided',
  ADD COLUMN IF NOT EXISTS rbq_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS rbq_expiry_date date,
  ADD COLUMN IF NOT EXISTS rbq_last_check timestamptz;

CREATE INDEX IF NOT EXISTS contractors_rbq_compliance_status_idx ON public.contractors(rbq_compliance_status);

UPDATE public.contractors
SET rbq_compliance_status = 'verified',
    rbq_verified_at = COALESCE(rbq_verified_at, now()),
    rbq_last_check = now()
WHERE rbq_number IS NOT NULL AND length(trim(rbq_number)) > 0
  AND verification_status::text = 'verified';

UPDATE public.contractors
SET rbq_compliance_status = 'in_progress',
    rbq_last_check = now()
WHERE rbq_number IS NOT NULL AND length(trim(rbq_number)) > 0
  AND (verification_status IS NULL OR verification_status::text <> 'verified')
  AND rbq_compliance_status = 'not_provided';

ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.partners
DROP CONSTRAINT IF EXISTS partners_partner_type_check;

ALTER TABLE public.partners
ADD CONSTRAINT partners_partner_type_check
CHECK (partner_type IN ('affiliate','ambassador','certified_partner','territory_partner','partner_admin'));

CREATE INDEX IF NOT EXISTS idx_partners_city ON public.partners(city);
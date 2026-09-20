CREATE UNIQUE INDEX IF NOT EXISTS affiliates_user_id_key ON public.affiliates (user_id);
DROP INDEX IF EXISTS public.affiliates_user_id_unique;
CREATE UNIQUE INDEX IF NOT EXISTS partner_terms_acceptance_unique ON public.partner_terms_acceptance (partner_id, role, terms_version);
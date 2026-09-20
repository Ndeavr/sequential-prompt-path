CREATE UNIQUE INDEX IF NOT EXISTS partner_terms_acceptance_user_unique
  ON public.partner_terms_acceptance (user_id, role, terms_version);
DROP INDEX IF EXISTS public.partner_terms_acceptance_unique;
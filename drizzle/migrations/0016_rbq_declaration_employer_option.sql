ALTER TABLE public.contractors DROP CONSTRAINT IF EXISTS contractors_rbq_declaration_chk;
ALTER TABLE public.contractors ADD CONSTRAINT contractors_rbq_declaration_chk
  CHECK (rbq_declaration IS NULL OR rbq_declaration IN ('has_license','not_required','in_progress','unsure','other','employer_licensed'));
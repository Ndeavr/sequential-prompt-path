CREATE TABLE IF NOT EXISTS public.internal_job_tokens (
  job_key text PRIMARY KEY,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.internal_job_tokens TO service_role;

ALTER TABLE public.internal_job_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "internal job tokens are service-only"
ON public.internal_job_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_internal_job_tokens_updated_at
BEFORE UPDATE ON public.internal_job_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
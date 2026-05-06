CREATE TABLE public.partner_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salutation TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit partner application"
ON public.partner_applications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view partner applications"
ON public.partner_applications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update partner applications"
ON public.partner_applications FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_partner_applications_created_at ON public.partner_applications(created_at DESC);


-- Table for tax rules (extensible by jurisdiction)
CREATE TABLE public.tax_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL DEFAULT 'CA',
  province_code TEXT NOT NULL DEFAULT 'QC',
  tax_name TEXT NOT NULL,
  tax_code TEXT NOT NULL,
  tax_rate NUMERIC(8,5) NOT NULL,
  tax_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_rules ENABLE ROW LEVEL SECURITY;

-- Everyone can read tax rules
CREATE POLICY "Anyone can read tax rules"
  ON public.tax_rules FOR SELECT
  USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage tax rules"
  ON public.tax_rules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed Quebec taxes
INSERT INTO public.tax_rules (country_code, province_code, tax_name, tax_code, tax_rate, tax_order)
VALUES
  ('CA', 'QC', 'TPS', 'gst', 0.05000, 1),
  ('CA', 'QC', 'TVQ', 'qst', 0.09975, 2);

-- Updated_at trigger
CREATE TRIGGER update_tax_rules_updated_at
  BEFORE UPDATE ON public.tax_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.plan_catalog 
  ADD COLUMN IF NOT EXISTS stripe_one_time_price_id TEXT,
  ADD COLUMN IF NOT EXISTS yearly_discount_percent NUMERIC(5,2) DEFAULT 20.00;

UPDATE public.plan_catalog 
SET stripe_one_time_price_id = 'price_1TOJVLCvZwK1QnPVivhwKQUS'
WHERE code = 'founder_lifetime';

-- Set yearly discount defaults (20% off equivalent monthly)
UPDATE public.plan_catalog 
SET yearly_discount_percent = 20.00
WHERE code IN ('recrue', 'pro_acq', 'premium_acq', 'elite_acq');

UPDATE public.plan_catalog 
SET yearly_discount_percent = 0
WHERE billing_mode = 'one_time';
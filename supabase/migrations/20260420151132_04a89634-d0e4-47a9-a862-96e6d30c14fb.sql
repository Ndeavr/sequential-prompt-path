UPDATE public.plan_catalog SET 
  stripe_monthly_price_id = 'price_1TJf6lCvZwK1QnPV40NvbcaQ',
  stripe_yearly_price_id = 'price_1TJZb2CvZwK1QnPVI0hGFF39'
WHERE code = 'pro_acq';

UPDATE public.plan_catalog SET 
  stripe_monthly_price_id = 'price_1TJf6mCvZwK1QnPV9GWx7OEM',
  stripe_yearly_price_id = 'price_1TJZb3CvZwK1QnPVhn0vbYhM'
WHERE code = 'premium_acq';

UPDATE public.plan_catalog SET 
  stripe_monthly_price_id = 'price_1TJf6oCvZwK1QnPVX1kQNexL',
  stripe_yearly_price_id = 'price_1TJZb3CvZwK1QnPVe52XCyib'
WHERE code = 'elite_acq';
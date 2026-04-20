-- Hide Founder from public pricing grid (keep row, mark inactive so /founders private flow can still reference it if needed)
UPDATE public.plan_catalog
SET active = false
WHERE code = 'founder_lifetime';

-- Activate Signature as the premium anchor at $1,799/mo
UPDATE public.plan_catalog
SET 
  active = true,
  position_rank = 4,
  highlighted = false,
  badge_text = 'Domination territoriale',
  tagline = 'Pour les entreprises dominantes, multi-équipes et en mode expansion.',
  short_pitch = 'Mode domination · multi-territoires',
  monthly_price = 179900,
  annual_price = 1727000,
  billing_mode = 'subscription'
WHERE code = 'signature';

-- Reinforce psychology: keep Premium as the visually dominant featured plan
UPDATE public.plan_catalog
SET highlighted = true, badge_text = 'Le plus populaire'
WHERE code = 'premium_acq';

UPDATE public.plan_catalog
SET highlighted = false
WHERE code IN ('pro_acq', 'elite_acq');
INSERT INTO public.plan_included_appointments (plan_code, included_appointments_monthly, included_units_monthly, base_extra_appointment_price)
VALUES
  ('presence', 1, 1.00, 99),
  ('local', 2, 2.00, 99),
  ('croissance', 4, 4.00, 99),
  ('domination', 40, 40.00, 99)
ON CONFLICT (plan_code) DO UPDATE
  SET included_appointments_monthly = EXCLUDED.included_appointments_monthly,
      included_units_monthly = EXCLUDED.included_units_monthly,
      updated_at = now();
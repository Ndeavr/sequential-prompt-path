
INSERT INTO public.sms_sprint_campaigns (id, name, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Smoke Test Campaign', 'test')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.sms_sprint_prospects
  (campaign_id, company_name, city, category, roi_score, phone_e164, phone_type,
   google_rating, review_count, qualification_status, variant, tracking_slug, activation_status)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test Founder', 'Montréal', 'toiture',
   95, '+15142499522', 'mobile', 4.9, 42, 'qualified', 'A', 'test-founder', 'sent')
ON CONFLICT (tracking_slug) DO NOTHING;

GRANT SELECT (
  quick_wins, competitor_gap,
  estimated_monthly_loss_min, estimated_monthly_loss_max,
  screenshot_url, screenshot_mobile_url,
  landing_url, is_running_ads, paid_intent_confidence,
  loom_script, loom_status
) ON public.contractors_prospects TO anon;
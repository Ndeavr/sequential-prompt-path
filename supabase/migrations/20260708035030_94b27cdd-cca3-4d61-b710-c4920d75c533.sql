
INSERT INTO public.contractor_subscriptions (
  contractor_id, stripe_customer_id, stripe_subscription_id,
  plan_id, billing_interval, status,
  current_period_start, current_period_end,
  cancel_at_period_end, updated_at
)
SELECT
  '72bc8179-d836-497d-8114-e0fcd773281b'::uuid,
  'cus_UqSCJFKK3PoBlv',
  'sub_1TqmPrCvZwK1QnPVypk1H1xs',
  (SELECT id FROM public.plans WHERE code='recrue' LIMIT 1),
  'monthly',
  'active',
  to_timestamp(1783482292),
  to_timestamp(1786160692),
  false,
  now()
ON CONFLICT (contractor_id) DO UPDATE SET
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  stripe_subscription_id = EXCLUDED.stripe_subscription_id,
  plan_id = COALESCE(EXCLUDED.plan_id, public.contractor_subscriptions.plan_id),
  billing_interval = EXCLUDED.billing_interval,
  status = 'active',
  current_period_start = EXCLUDED.current_period_start,
  current_period_end = EXCLUDED.current_period_end,
  cancel_at_period_end = false,
  updated_at = now();

UPDATE public.contractors
SET account_status='active',
    activation_status='active',
    onboarding_status='completed',
    is_published=true,
    is_discoverable=true,
    is_accepting_appointments=true,
    published_at=COALESCE(published_at, now()),
    updated_at=now()
WHERE id='72bc8179-d836-497d-8114-e0fcd773281b';

UPDATE public.checkout_sessions
SET checkout_status='paid',
    stripe_customer_id='cus_UqSCJFKK3PoBlv',
    stripe_subscription_id='sub_1TqmPrCvZwK1QnPVypk1H1xs',
    currency='CAD'
WHERE external_checkout_id='cs_live_a172cMZUsjwOOJfirSBlyR3iFkfUpxFfGIJMOCgYNa8xkYRQYbee0h4NLI';

UPDATE public.stripe_webhook_events
SET processed_at=now(), success=true, error_message='recovered manually after period-field fix'
WHERE stripe_event_id IN ('evt_1TqmPsCvZwK1QnPVXSgtbk33','evt_1TqmPtCvZwK1QnPVNSFm2lS5');

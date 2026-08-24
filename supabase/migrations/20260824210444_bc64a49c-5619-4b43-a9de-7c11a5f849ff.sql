alter table public.stripe_webhook_events
  add column if not exists prospect_id text,
  add column if not exists payment_intent_id text,
  add column if not exists livemode boolean,
  add column if not exists attribution jsonb not null default '{}'::jsonb;

create index if not exists idx_stripe_webhook_events_prospect on public.stripe_webhook_events(prospect_id);
create index if not exists idx_stripe_webhook_events_status on public.stripe_webhook_events(processing_status, received_at desc);
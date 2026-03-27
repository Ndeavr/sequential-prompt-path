
-- Outreach Engine Tables
-- ======================

create table outreach_send_windows (
  id uuid primary key default gen_random_uuid(),
  window_name text not null,
  timezone text default 'America/Montreal',
  allowed_days_json jsonb default '["mon","tue","wed","thu","fri"]'::jsonb,
  start_hour int default 9,
  end_hour int default 17,
  exclude_holidays boolean default true,
  is_active boolean default true
);

create table outreach_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  campaign_type text,
  source_campaign_id uuid references prospection_campaigns(id) on delete set null,
  status text default 'draft',
  language text default 'fr',
  primary_channel text default 'email',
  email_provider text default 'lovable',
  smtp_profile_key text,
  sms_provider text default 'twilio',
  twilio_profile_key text,
  default_sender_name text,
  default_sender_email text,
  default_sender_phone text,
  default_promo_code text,
  send_window_id uuid references outreach_send_windows(id) on delete set null,
  daily_send_limit int default 200,
  hourly_send_limit int default 25,
  stop_on_conversion boolean default true,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  launched_at timestamptz,
  completed_at timestamptz
);

create table outreach_sequences (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references outreach_campaigns(id) on delete cascade,
  sequence_name text not null,
  status text default 'draft',
  created_at timestamptz default now()
);

create table outreach_sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid references outreach_sequences(id) on delete cascade,
  step_order int not null,
  channel_type text not null,
  step_name text,
  subject_template text,
  body_template text,
  delay_hours int default 0,
  send_if_json jsonb default '{}'::jsonb,
  skip_if_json jsonb default '{}'::jsonb,
  stop_if_json jsonb default '{}'::jsonb,
  track_opens boolean default true,
  track_clicks boolean default true,
  is_active boolean default true
);

create table outreach_templates (
  id uuid primary key default gen_random_uuid(),
  template_name text not null,
  channel_type text not null,
  language text default 'fr',
  template_type text,
  subject_template text,
  body_template text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table outreach_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references outreach_templates(id) on delete cascade,
  version_number int not null,
  subject_template text,
  body_template text,
  created_at timestamptz default now()
);

create table outreach_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references outreach_campaigns(id) on delete cascade,
  prospect_id uuid references prospects(id) on delete cascade,
  recipient_status text default 'queued',
  current_step_order int default 0,
  next_send_at timestamptz,
  last_sent_at timestamptz,
  stopped_reason text,
  unsubscribe_status boolean default false,
  sms_opt_out boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table outreach_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references outreach_campaigns(id) on delete cascade,
  recipient_id uuid references outreach_recipients(id) on delete cascade,
  prospect_id uuid references prospects(id) on delete cascade,
  sequence_step_id uuid references outreach_sequence_steps(id) on delete set null,
  channel_type text not null,
  provider_name text,
  provider_message_id text,
  to_value text,
  from_value text,
  subject_rendered text,
  body_rendered text,
  message_status text default 'queued',
  queued_at timestamptz default now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  error_message text
);

create table outreach_delivery_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references outreach_messages(id) on delete cascade,
  event_type text not null,
  event_status text,
  provider_name text,
  provider_payload_json jsonb default '{}'::jsonb,
  occurred_at timestamptz default now()
);

create table outreach_open_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references outreach_messages(id) on delete cascade,
  prospect_id uuid references prospects(id) on delete cascade,
  campaign_id uuid references outreach_campaigns(id) on delete cascade,
  user_agent text,
  ip_hash text,
  opened_at timestamptz default now()
);

create table outreach_click_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references outreach_messages(id) on delete cascade,
  prospect_id uuid references prospects(id) on delete cascade,
  campaign_id uuid references outreach_campaigns(id) on delete cascade,
  clicked_url text,
  resolved_url text,
  clicked_at timestamptz default now()
);

create table outreach_reply_events (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references outreach_messages(id) on delete cascade,
  prospect_id uuid references prospects(id) on delete cascade,
  campaign_id uuid references outreach_campaigns(id) on delete cascade,
  channel_type text,
  reply_excerpt text,
  reply_detected_at timestamptz default now()
);

create table outreach_unsubscribes (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references prospects(id) on delete cascade,
  campaign_id uuid references outreach_campaigns(id) on delete cascade,
  channel_type text not null,
  unsubscribe_reason text,
  source text,
  created_at timestamptz default now()
);

create table outreach_suppressions (
  id uuid primary key default gen_random_uuid(),
  contact_type text not null,
  contact_value text not null,
  suppression_reason text,
  source text,
  created_at timestamptz default now()
);

create table outreach_provider_configs (
  id uuid primary key default gen_random_uuid(),
  provider_type text not null,
  provider_key text not null,
  config_json jsonb default '{}'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table outreach_domain_health_checks (
  id uuid primary key default gen_random_uuid(),
  domain_name text not null,
  dkim_status text,
  spf_status text,
  dmarc_status text,
  warmup_status text,
  bounce_rate numeric default 0,
  complaint_rate numeric default 0,
  last_checked_at timestamptz default now()
);

create table outreach_rate_limits (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references outreach_campaigns(id) on delete cascade,
  hour_key text not null,
  sent_count int default 0,
  limit_count int default 0,
  created_at timestamptz default now()
);

create table outreach_followup_rules (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references outreach_campaigns(id) on delete cascade,
  rule_name text not null,
  trigger_type text not null,
  condition_json jsonb default '{}'::jsonb,
  action_json jsonb default '{}'::jsonb,
  is_active boolean default true
);

create table outreach_webhook_logs (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null,
  webhook_type text not null,
  payload_json jsonb default '{}'::jsonb,
  processed_status text default 'pending',
  error_message text,
  received_at timestamptz default now()
);

-- Indexes
create index idx_outreach_campaigns_status on outreach_campaigns(status);
create index idx_outreach_recipients_campaign on outreach_recipients(campaign_id);
create index idx_outreach_recipients_prospect on outreach_recipients(prospect_id);
create index idx_outreach_recipients_status on outreach_recipients(recipient_status);
create index idx_outreach_recipients_next_send on outreach_recipients(next_send_at);
create index idx_outreach_messages_campaign on outreach_messages(campaign_id);
create index idx_outreach_messages_recipient on outreach_messages(recipient_id);
create index idx_outreach_messages_status on outreach_messages(message_status);
create index idx_outreach_open_events_message on outreach_open_events(message_id);
create index idx_outreach_click_events_message on outreach_click_events(message_id);
create index idx_outreach_suppressions_value on outreach_suppressions(contact_value);
create index idx_outreach_rate_limits_key on outreach_rate_limits(campaign_id, hour_key);

-- RLS
alter table outreach_send_windows enable row level security;
alter table outreach_campaigns enable row level security;
alter table outreach_sequences enable row level security;
alter table outreach_sequence_steps enable row level security;
alter table outreach_templates enable row level security;
alter table outreach_template_versions enable row level security;
alter table outreach_recipients enable row level security;
alter table outreach_messages enable row level security;
alter table outreach_delivery_events enable row level security;
alter table outreach_open_events enable row level security;
alter table outreach_click_events enable row level security;
alter table outreach_reply_events enable row level security;
alter table outreach_unsubscribes enable row level security;
alter table outreach_suppressions enable row level security;
alter table outreach_provider_configs enable row level security;
alter table outreach_domain_health_checks enable row level security;
alter table outreach_rate_limits enable row level security;
alter table outreach_followup_rules enable row level security;
alter table outreach_webhook_logs enable row level security;

-- Admin policies (using has_role)
create policy "admin_manage_send_windows" on outreach_send_windows for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_outreach_campaigns" on outreach_campaigns for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_outreach_sequences" on outreach_sequences for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_outreach_steps" on outreach_sequence_steps for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_outreach_templates" on outreach_templates for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_template_versions" on outreach_template_versions for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_outreach_recipients" on outreach_recipients for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_outreach_messages" on outreach_messages for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_delivery_events" on outreach_delivery_events for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_open_events" on outreach_open_events for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_click_events" on outreach_click_events for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_reply_events" on outreach_reply_events for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_unsubscribes" on outreach_unsubscribes for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_suppressions" on outreach_suppressions for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_provider_configs" on outreach_provider_configs for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_domain_health" on outreach_domain_health_checks for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_rate_limits" on outreach_rate_limits for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_followup_rules" on outreach_followup_rules for all using (public.has_role(auth.uid(), 'admin'));
create policy "admin_manage_webhook_logs" on outreach_webhook_logs for all using (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE outreach_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE outreach_recipients;

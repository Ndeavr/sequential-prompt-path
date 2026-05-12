
create table if not exists public.activation_pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  domain text,
  input_value text not null,
  input_kind text not null default 'website',
  pipeline_status text not null default 'pending',
  current_step text not null default 'queued',
  extraction jsonb not null default '{}'::jsonb,
  screenshot_url text,
  signals jsonb not null default '{}'::jsonb,
  aipp_score numeric(5,2),
  aipp_breakdown jsonb not null default '{}'::jsonb,
  recommended_plan text,
  recommendation jsonb not null default '{}'::jsonb,
  partial_confidence boolean not null default false,
  error_log jsonb not null default '[]'::jsonb,
  user_id uuid,
  contractor_id uuid,
  stripe_payment_intent_id text,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_apr_domain on public.activation_pipeline_runs(domain);
create index if not exists idx_apr_status on public.activation_pipeline_runs(pipeline_status);
create index if not exists idx_apr_created on public.activation_pipeline_runs(created_at desc);

alter table public.activation_pipeline_runs enable row level security;

create policy "Anyone can create activation run"
on public.activation_pipeline_runs
for insert
to anon, authenticated
with check (true);

create policy "Anyone can read activation run by id"
on public.activation_pipeline_runs
for select
to anon, authenticated
using (true);

create trigger update_apr_updated_at
before update on public.activation_pipeline_runs
for each row execute function public.update_updated_at_column();

alter publication supabase_realtime add table public.activation_pipeline_runs;


create table if not exists public.live_acquisition_runs (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid,
  prospect_table text not null default 'war_prospects',
  campaign text not null,
  status text not null default 'running',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.acquisition_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.live_acquisition_runs(id) on delete cascade,
  step_key text not null,
  step_order int not null,
  status text not null default 'pending',
  logs jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  retry_count int not null default 0,
  unique(run_id, step_key)
);

create index if not exists idx_run_steps_run on public.acquisition_run_steps(run_id, step_order);

alter table public.live_acquisition_runs enable row level security;
alter table public.acquisition_run_steps enable row level security;

create policy "admin_all_runs" on public.live_acquisition_runs
  for all using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create policy "admin_all_run_steps" on public.acquisition_run_steps
  for all using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

create or replace function public.touch_live_acquisition_runs()
returns trigger language plpgsql security definer set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_touch_live_runs on public.live_acquisition_runs;
create trigger trg_touch_live_runs before update on public.live_acquisition_runs
for each row execute function public.touch_live_acquisition_runs();

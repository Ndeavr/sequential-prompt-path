create table if not exists public.system_alerts (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  severity text not null default 'warning',
  code text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists system_alerts_created_idx on public.system_alerts (created_at desc);
create index if not exists system_alerts_source_idx on public.system_alerts (source, resolved, created_at desc);

grant select, insert, update on public.system_alerts to authenticated;
grant all on public.system_alerts to service_role;

alter table public.system_alerts enable row level security;

drop policy if exists "admins read system_alerts" on public.system_alerts;
create policy "admins read system_alerts"
  on public.system_alerts for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins update system_alerts" on public.system_alerts;
create policy "admins update system_alerts"
  on public.system_alerts for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- CATEGORIES
-- =========================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  service_group text,
  priority integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_format_chk
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index if not exists idx_categories_is_active on public.categories(is_active);
create index if not exists idx_categories_priority on public.categories(priority);
create index if not exists idx_categories_service_group on public.categories(service_group);

-- =========================================================
-- SERVICE AREAS
-- =========================================================
create table if not exists public.service_areas (
  id uuid primary key default gen_random_uuid(),
  city_slug text not null unique,
  city_name text not null,
  region_name text,
  province_code text not null default 'QC',
  market_tier text not null default 'medium',
  population integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_areas_city_slug_format_chk
    check (city_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint service_areas_market_tier_chk
    check (market_tier in ('mega', 'large', 'medium', 'small', 'micro'))
);

create index if not exists idx_service_areas_is_active on public.service_areas(is_active);
create index if not exists idx_service_areas_market_tier on public.service_areas(market_tier);
create index if not exists idx_service_areas_region_name on public.service_areas(region_name);

-- =========================================================
-- SYSTEM SETTINGS
-- =========================================================
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

-- =========================================================
-- TERRITORY GENERATION LOGS
-- =========================================================
create table if not exists public.territory_generation_logs (
  id uuid primary key default gen_random_uuid(),
  executed_by uuid,
  cities_count integer not null default 0,
  categories_count integer not null default 0,
  total_combinations integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  error_count integer not null default 0,
  mode text not null,
  payload jsonb,
  created_at timestamptz not null default now(),
  constraint territory_generation_logs_mode_chk
    check (mode in ('dry_run', 'create_missing', 'upsert_all'))
);

create index if not exists idx_territory_generation_logs_created_at
  on public.territory_generation_logs(created_at desc);

-- =========================================================
-- updated_at triggers
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger trg_service_areas_updated_at
before update on public.service_areas
for each row execute function public.set_updated_at();

-- =========================================================
-- RLS
-- =========================================================
alter table public.categories enable row level security;
alter table public.service_areas enable row level security;
alter table public.territory_generation_logs enable row level security;
alter table public.system_settings enable row level security;

create policy "categories read authenticated" on public.categories for select to authenticated using (true);
create policy "service_areas read authenticated" on public.service_areas for select to authenticated using (true);
create policy "generation_logs read authenticated" on public.territory_generation_logs for select to authenticated using (true);
create policy "system_settings read authenticated" on public.system_settings for select to authenticated using (true);

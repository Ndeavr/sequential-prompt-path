create table if not exists public.official_source_registry (
  source_key text primary key,
  source_name text not null,
  publisher text not null,
  source_url text not null,
  document_type text not null default 'pdf',
  certification text,
  access_policy text,
  robots_allowed boolean not null default true,
  last_fetched_at timestamptz,
  last_document_sha256 text,
  last_record_count integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.official_source_records (
  id uuid primary key default gen_random_uuid(),
  source_key text not null references public.official_source_registry(source_key) on delete cascade,
  source_name text not null,
  source_url text not null,
  certification text,
  certificate_no text,
  business_name text not null,
  business_name_norm text not null,
  phone_raw text,
  phone_e164 text,
  email text,
  municipality text,
  region text,
  priority_rank integer not null default 99,
  specialty_bonus integer not null default 0,
  trust_bonus integer not null default 0,
  provenance jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  dedupe_status text not null default 'pending',
  dedupe_match_table text,
  dedupe_match_id text,
  dedupe_signals jsonb not null default '{}'::jsonb,
  eligibility_status text not null default 'pending',
  blocked_reason text,
  prospect_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_key, certificate_no)
);

create index if not exists idx_official_source_records_phone on public.official_source_records(phone_e164);
create index if not exists idx_official_source_records_name on public.official_source_records(business_name_norm);
create index if not exists idx_official_source_records_priority on public.official_source_records(priority_rank, eligibility_status);

grant select on public.official_source_registry to authenticated;
grant all on public.official_source_registry to service_role;
grant select on public.official_source_records to authenticated;
grant all on public.official_source_records to service_role;

alter table public.official_source_registry enable row level security;
alter table public.official_source_records enable row level security;

drop policy if exists "admins read official source registry" on public.official_source_registry;
create policy "admins read official source registry" on public.official_source_registry
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins read official source records" on public.official_source_records;
create policy "admins read official source records" on public.official_source_records
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace view public.v_supply_discovery_by_source
with (security_invoker = on) as
select
  'official_quebec'::text as source_key,
  'Sources officielles Québec'::text as source_label,
  count(*)::bigint as records_total,
  count(*) filter (where dedupe_status = 'new')::bigint as records_new,
  count(*) filter (where eligibility_status = 'eligible')::bigint as eligible_yield,
  count(*) filter (where prospect_id is not null)::bigint as promoted,
  max(fetched_at) as last_activity_at
from public.official_source_records
union all
select
  'google_places',
  'Google Places',
  count(*)::bigint,
  count(*) filter (where created_at > now() - interval '24 hours')::bigint,
  count(*) filter (where phone is not null and phone <> '')::bigint,
  0::bigint,
  max(created_at)
from public.outbound_companies
where google_place_id is not null
union all
select
  'existing_db',
  'Inventaire UNPRO (DB / cache)',
  count(*)::bigint,
  count(*) filter (where created_at > now() - interval '24 hours')::bigint,
  count(*) filter (where phone is not null and phone <> '' and do_not_contact = false)::bigint,
  0::bigint,
  max(created_at)
from public.contractor_prospects;

grant select on public.v_supply_discovery_by_source to authenticated;
grant select on public.v_supply_discovery_by_source to service_role;
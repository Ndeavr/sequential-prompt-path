
create table public.founder_eligible_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_fr text not null,
  group_type text not null check (group_type in ('local_service','professional')),
  internal_cap_per_city int not null default 3,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.founder_eligible_categories to anon, authenticated;
grant all on public.founder_eligible_categories to service_role;

alter table public.founder_eligible_categories enable row level security;

create policy "Anyone can read active founder categories"
  on public.founder_eligible_categories for select to anon, authenticated
  using (is_active = true);

insert into public.founder_eligible_categories (slug, name_fr, group_type, internal_cap_per_city) values
  ('entretien-menager', 'Entretien ménager', 'local_service', 3),
  ('lavage-de-vitres', 'Lavage de vitres', 'local_service', 3),
  ('entretien-gazon', 'Entretien de gazon', 'local_service', 3),
  ('abris-temporaires', 'Abris temporaires', 'local_service', 3),
  ('nettoyage-conduits', 'Nettoyage de conduits', 'local_service', 3),
  ('entretien-preventif-domicile', 'Maintenance / services à la maison', 'local_service', 3),
  ('agent-courtier-immobilier', 'Agent / courtier immobilier', 'professional', 3),
  ('courtier-hypothecaire', 'Courtier hypothécaire', 'professional', 3),
  ('notaire', 'Notaire', 'professional', 3),
  ('evaluateur-immobilier', 'Évaluateur immobilier', 'professional', 3),
  ('inspecteur-batiment', 'Inspecteur en bâtiment', 'professional', 3),
  ('arpenteur-geometre', 'Arpenteur-géomètre', 'professional', 3);

create table public.founder_memberships (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text,
  email text not null,
  phone text,
  city text not null,
  category_slug text not null references public.founder_eligible_categories(slug),
  status text not null default 'founder_activated' check (status in (
    'founder_eligible','founder_invited','founder_landing_viewed','founder_signup_started',
    'identity_contact_verified','founder_activated','first_referral',
    'renewal_due','renewed','expired','waitlisted'
  )),
  founder_start timestamptz,
  founder_end timestamptz,
  renewal_price_cents int not null default 35000,
  renewal_cadence text not null default 'year',
  attribution jsonb not null default '{}'::jsonb,
  prospect_id uuid,
  source text not null default 'public_founder_landing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index founder_memberships_unique_signup
  on public.founder_memberships (lower(email), city, category_slug);
create index founder_memberships_city_idx on public.founder_memberships (city);
create index founder_memberships_category_idx on public.founder_memberships (category_slug);
create index founder_memberships_status_idx on public.founder_memberships (status);

grant select on public.founder_memberships to authenticated;
grant all on public.founder_memberships to service_role;

alter table public.founder_memberships enable row level security;

create policy "Admins can read founder memberships"
  on public.founder_memberships for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update founder memberships"
  on public.founder_memberships for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace function public.check_founder_eligibility(p_city text, p_category_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cat record;
  v_city_count int;
  v_cat_count int;
  v_city_cap int := 10;
begin
  select * into v_cat from public.founder_eligible_categories
  where slug = p_category_slug and is_active = true;

  if not found then
    return jsonb_build_object('eligible', false, 'reason', 'category_not_eligible', 'city_remaining', null);
  end if;

  select count(*) into v_city_count from public.founder_memberships
  where lower(city) = lower(trim(p_city))
    and status in ('founder_activated','first_referral','renewal_due','renewed');

  select count(*) into v_cat_count from public.founder_memberships
  where lower(city) = lower(trim(p_city))
    and category_slug = p_category_slug
    and status in ('founder_activated','first_referral','renewal_due','renewed');

  if v_city_count >= v_city_cap then
    return jsonb_build_object('eligible', false, 'reason', 'city_full', 'city_remaining', 0);
  end if;

  if v_cat_count >= v_cat.internal_cap_per_city then
    return jsonb_build_object('eligible', false, 'reason', 'city_full', 'city_remaining', greatest(v_city_cap - v_city_count, 0));
  end if;

  return jsonb_build_object('eligible', true, 'reason', null, 'city_remaining', greatest(v_city_cap - v_city_count, 0));
end;
$$;

revoke all on function public.check_founder_eligibility(text, text) from public;
grant execute on function public.check_founder_eligibility(text, text) to anon, authenticated;

create or replace function public.founder_public_signup(
  p_business_name text,
  p_contact_name text,
  p_email text,
  p_phone text,
  p_city text,
  p_category_slug text,
  p_attribution jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_check jsonb;
  v_id uuid;
  v_end timestamptz;
begin
  if p_business_name is null or trim(p_business_name) = ''
     or p_email is null or position('@' in p_email) = 0
     or p_city is null or trim(p_city) = '' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_input');
  end if;

  v_check := public.check_founder_eligibility(p_city, p_category_slug);
  if not (v_check->>'eligible')::boolean then
    return jsonb_build_object('ok', false, 'reason', coalesce(v_check->>'reason', 'not_eligible'));
  end if;

  begin
    insert into public.founder_memberships (
      business_name, contact_name, email, phone, city, category_slug,
      status, founder_start, founder_end,
      renewal_price_cents, renewal_cadence, attribution, source
    ) values (
      trim(p_business_name), nullif(trim(p_contact_name), ''), lower(trim(p_email)),
      nullif(trim(p_phone), ''), trim(p_city), p_category_slug,
      'founder_activated', now(), now() + interval '12 months',
      35000, 'year', coalesce(p_attribution, '{}'::jsonb), 'public_founder_landing'
    )
    returning id, founder_end into v_id, v_end;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'duplicate_signup');
  end;

  return jsonb_build_object(
    'ok', true,
    'membership_id', v_id,
    'status', 'founder_activated',
    'founder_end', v_end,
    'renewal_price_cents', 35000,
    'renewal_cadence', 'year'
  );
end;
$$;

revoke all on function public.founder_public_signup(text, text, text, text, text, text, jsonb) from public;
grant execute on function public.founder_public_signup(text, text, text, text, text, text, jsonb) to anon, authenticated;

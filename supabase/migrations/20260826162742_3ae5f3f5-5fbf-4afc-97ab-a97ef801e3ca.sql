create or replace function public.affiliate_entry_by_slug(p_slug text)
returns table (
  slug text,
  first_name text,
  display_name text,
  status text,
  referral_code text,
  has_account boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.slug,
    a.first_name,
    coalesce(nullif(trim(coalesce(a.first_name,'') || ' ' || coalesce(a.last_name,'')), ''), a.name) as display_name,
    a.status,
    a.referral_code,
    (a.user_id is not null) as has_account
  from public.affiliates a
  where a.slug = lower(trim(p_slug))
    and a.status = 'active'
  limit 1
$$;

revoke all on function public.affiliate_entry_by_slug(text) from public;
grant execute on function public.affiliate_entry_by_slug(text) to anon, authenticated, service_role;
-- STAGED, NOT APPLIED. One-time single-recipient commercial email grant.
-- Grants are created only by a signed-in admin as themselves, bound to a human-signed
-- casl_consent_evidence row for the exact address, expire, and are consumed once.
create table public.outreach_single_send_grants (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null check (recipient_email = lower(btrim(recipient_email))),
  campaign text not null,
  evidence_id uuid not null references public.casl_consent_evidence(id),
  granted_by uuid not null,
  reason text not null check (length(btrim(reason)) >= 30),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  provider_id text,
  created_at timestamptz not null default now(),
  check (expires_at <= created_at + interval '48 hours')
);
create unique index outreach_single_send_grants_one_open
  on public.outreach_single_send_grants (recipient_email) where consumed_at is null;
alter table public.outreach_single_send_grants enable row level security;
revoke all on public.outreach_single_send_grants from anon, authenticated;
grant select on public.outreach_single_send_grants to authenticated;
create policy "admins read grants" on public.outreach_single_send_grants
  for select to authenticated using (public.has_role(auth.uid(), 'admin'::app_role));

create or replace function public.create_outreach_single_send_grant(p_evidence uuid, p_campaign text, p_reason text, p_hours int default 24)
returns uuid language plpgsql security definer set search_path = public as $$
declare e record; gid uuid;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin'::app_role) then raise exception 'grant_requires_admin'; end if;
  select * into e from casl_consent_evidence where id = p_evidence;
  if e.id is null or e.destination_type <> 'email' or e.reviewer_id is null or not e.is_valid
     or coalesce(e.refusal_statement_found,false) or (e.expires_at is not null and e.expires_at < now()) then
    raise exception 'grant_requires_signed_valid_evidence';
  end if;
  insert into outreach_single_send_grants (recipient_email, campaign, evidence_id, granted_by, reason, expires_at)
  values (lower(btrim(e.destination_normalized)), p_campaign, e.id, auth.uid(), p_reason, now() + make_interval(hours => least(greatest(p_hours,1),48)))
  returning id into gid;
  return gid;
end $$;
revoke all on function public.create_outreach_single_send_grant(uuid,text,text,int) from public, anon;
grant execute on function public.create_outreach_single_send_grant(uuid,text,text,int) to authenticated;

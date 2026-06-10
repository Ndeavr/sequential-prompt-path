
-- Launch activation wiring: extra columns + admin notification trigger
alter table public.launch_leads
  add column if not exists checkout_url text,
  add column if not exists subscription_id text,
  add column if not exists paid_at timestamptz;

create or replace function public.notify_launch_activation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.lead_status = 'ACTIVATED' and (old.lead_status is distinct from 'ACTIVATED') then
    insert into public.admin_notifications(type, severity, title, body, payload_json)
    values(
      'launch_activation',
      'success',
      'Contractor activé via Launch Mode',
      coalesce(new.company_name, 'Lead ' || new.id::text),
      jsonb_build_object('lead_id', new.id, 'mrr_cents', coalesce(new.mrr_cents, 0), 'plan', new.recommended_plan)
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_launch_activation on public.launch_leads;
create trigger trg_notify_launch_activation
  after update on public.launch_leads
  for each row execute function public.notify_launch_activation();

-- Reversible, service-only snapshot transaction. No existing rows are changed by installation.
create or replace function public.commit_google_calendar_snapshot(
 p_connection_id uuid, p_user_id uuid, p_calendar_id text, p_calendar_name text,
 p_access_role text, p_expected_metadata jsonb, p_windows jsonb, p_is_selection boolean
) returns void language plpgsql security invoker set search_path = public as $$
declare c public.calendar_connections%rowtype; w jsonb;
begin
 select * into c from public.calendar_connections where id=p_connection_id and user_id=p_user_id and provider='google' and connection_status='connected' for update;
 if not found then raise exception 'connection_unavailable'; end if;
 if coalesce(c.metadata,'{}'::jsonb) <> coalesce(p_expected_metadata,'{}'::jsonb) then raise exception 'calendar_changed_retry'; end if;
 if not p_is_selection and c.metadata->>'selected_calendar_id' is distinct from p_calendar_id then raise exception 'calendar_changed_retry'; end if;
 if p_calendar_id is null or length(p_calendar_id)=0 or p_access_role not in ('owner','writer','writerWithoutPrivateAccess') then raise exception 'invalid_calendar'; end if;
 if jsonb_typeof(p_windows) <> 'array' then raise exception 'invalid_windows'; end if;
 -- Preserve UNPRO booking blocks (external_event_id populated).
 delete from public.calendar_busy_periods where calendar_connection_id=c.id and external_event_id is null;
 for w in select value from jsonb_array_elements(p_windows) loop
   if (w->>'start')::timestamptz is null or (w->>'end')::timestamptz is null or (w->>'end')::timestamptz <= (w->>'start')::timestamptz then raise exception 'invalid_window'; end if;
   insert into public.calendar_busy_periods(calendar_connection_id,user_id,provider,starts_at,ends_at,synced_at)
   values(c.id,c.user_id,'google',(w->>'start')::timestamptz,(w->>'end')::timestamptz,now());
 end loop;
 update public.calendar_connections set metadata=coalesce(c.metadata,'{}'::jsonb)||jsonb_build_object('selected_calendar_id',p_calendar_id,'selected_calendar_name',p_calendar_name,'selected_calendar_access_role',p_access_role,'calendar_snapshot_version',gen_random_uuid()::text),last_synced_at=now(),last_error_message=null where id=c.id;
end; $$;
revoke all on function public.commit_google_calendar_snapshot(uuid,uuid,text,text,text,jsonb,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.commit_google_calendar_snapshot(uuid,uuid,text,text,text,jsonb,jsonb,boolean) to service_role;

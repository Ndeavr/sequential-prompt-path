import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getGoogleAccessToken, fetchGoogleBusy } from '../_shared/googleCalendar.ts';
import { listGoogleCalendars, canWriteCalendar } from '../_shared/googleCalendarSelection.ts';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: {...cors, 'Content-Type':'application/json'} });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers:cors});
  if (req.method !== 'POST') return json({error:'method_not_allowed'},405);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i,'');
    const {data:{user},error:authError} = await admin.auth.getUser(token);
    if (authError || !user) return json({error:'unauthorized'},401);
    const {data:connection,error} = await admin.from('calendar_connections').select('*').eq('user_id',user.id).eq('provider','google').eq('connection_status','connected').maybeSingle();
    if(error) return json({error:'connection_unavailable'},500);
    if(!connection) return json({error:'google_reconnect_required'},409);
    const secret = Deno.env.get('CALENDAR_TOKEN_ENCRYPTION_KEY') || Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '';
    const accessToken = await getGoogleAccessToken(admin,connection,secret);
    const calendars = await listGoogleCalendars(accessToken);
    const body = await req.json().catch(()=>({}));
    if (body.action === 'select') {
      const selected = calendars.find(c=>c.id===body.calendar_id);
      if(!selected) return json({error:'calendar_not_accessible'},403);
      // UNPRO writes confirmed appointments; keep read-only calendars visible but disabled.
      if(!canWriteCalendar(selected.accessRole)) return json({error:'calendar_write_permission_required'},403);
      const from = new Date();
      const windows = await fetchGoogleBusy(accessToken,from.toISOString(),new Date(from.getTime()+45*86400000).toISOString(),selected.id);
      const {error:saveError} = await admin.rpc('commit_google_calendar_snapshot',{
        p_connection_id:connection.id,p_user_id:user.id,p_calendar_id:selected.id,
        p_calendar_name:selected.name,p_access_role:selected.accessRole,
        p_expected_metadata:connection.metadata ?? {},p_windows:windows,p_is_selection:true,
      });
      if(saveError) return json({error:'calendar_changed_retry'},409);
      return json({selected_calendar_id:selected.id,selected_calendar_name:selected.name,synced:true});
    }
    if(body.action && body.action!=='list') return json({error:'invalid_action'},400);
    return json({calendars,selected_calendar_id:connection.metadata?.selected_calendar_id ?? null});
  } catch(error) {
    const code = error instanceof Error ? error.message : '';
    const allowed = ['google_reconnect_required','google_calendar_permission_required','calendar_refresh_token_missing','calendar_access_revoked'];
    return json({error:allowed.includes(code)?code:'calendar_operation_failed'},502);
  }
});

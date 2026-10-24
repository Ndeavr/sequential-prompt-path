/**
 * Explicit Google calendar selection for an authenticated contractor.
 * Does not authorize Google, expose provider credentials or touch events.
 * Only the chosen writable calendar may receive UNPRO bookings.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { CalendarAuthRevoked, getGoogleAccessToken } from "../_shared/googleCalendar.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type GoogleCalendarItem = {
  id: string;
  summary: string;
  accessRole: string;
  primary?: boolean;
};
const writable = (c: GoogleCalendarItem) => c.accessRole === "owner" || c.accessRole === "writer";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function listCalendars(token: string): Promise<GoogleCalendarItem[]> {
  const list: GoogleCalendarItem[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 8; page++) {
    const url = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList");
    url.searchParams.set("maxResults", "250");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (response.status === 401) throw new CalendarAuthRevoked();
    if (!response.ok) throw new Error(`google_calendar_list_failed:${response.status}`);
    const body = await response.json() as { items?: unknown; nextPageToken?: string };
    for (const item of Array.isArray(body.items) ? body.items : []) {
      if (!item || typeof item !== "object") continue;
      const c = item as Record<string, unknown>;
      if (typeof c.id !== "string" || !c.id || typeof c.summary !== "string") continue;
      const role = typeof c.accessRole === "string" ? c.accessRole : "";
      list.push({ id: c.id, summary: c.summary.slice(0, 180), accessRole: role, primary: c.primary === true });
    }
    if (!body.nextPageToken) return list;
    pageToken = body.nextPageToken;
  }
  // Never show a partial list as complete: a calendar could be left out.
  throw new Error("google_calendar_list_truncated");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!bearer) return json({ error: "unauthorized" }, 401);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: { user }, error: authError } = await admin.auth.getUser(bearer);
  if (authError || !user) return json({ error: "unauthorized" }, 401);

  const body = req.method === "POST" ? await req.json().catch(() => null) as Record<string, unknown> | null : null;
  const contractorId = req.method === "GET" ? new URL(req.url).searchParams.get("contractor_id") : body?.contractor_id;
  if (typeof contractorId !== "string" || !UUID.test(contractorId)) return json({ error: "invalid_contractor" }, 400);

  const { data: contractor, error: ownerError } = await admin.from("contractors")
    .select("id, user_id").eq("id", contractorId).eq("user_id", user.id).maybeSingle();
  if (ownerError) return json({ error: "contractor_lookup_failed" }, 503);
  if (!contractor) return json({ error: "forbidden" }, 403);

  const { data: connection, error: connectionError } = await admin.from("calendar_connections")
    .select("id, user_id, access_token_encrypted, refresh_token_encrypted, expires_at, connection_status")
    .eq("user_id", user.id).eq("provider", "google").maybeSingle();
  if (connectionError) return json({ error: "connection_lookup_failed" }, 503);
  if (!connection || connection.connection_status !== "connected") {
    return json({ connected: false, calendars: [], selected_id: null, reason: "no_unpro_google_connection" }, req.method === "POST" ? 409 : 200);
  }

  const secret = Deno.env.get("CALENDAR_TOKEN_ENCRYPTION_KEY") || Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") || "";
  if (!secret) return json({ error: "calendar_credentials_unavailable" }, 503);
  try {
    const token = await getGoogleAccessToken(admin, connection, secret);
    const calendars = await listCalendars(token);
    const { data: integration, error: integrationError } = await admin.from("booking_calendar_integrations")
      .select("selected_calendar_id, status").eq("contractor_id", contractorId).eq("provider", "google").maybeSingle();
    if (integrationError) return json({ error: "selection_lookup_failed" }, 503);

    if (req.method === "GET") {
      return json({
        connected: true,
        selected_id: integration?.selected_calendar_id ?? null,
        selection_status: integration?.status ?? "not_selected",
        calendars: calendars.map((c) => ({
          id: c.id, name: c.summary, writable: writable(c), primary: c.primary === true,
        })),
      });
    }

    const selectedId = body?.calendar_id;
    if (typeof selectedId !== "string" || selectedId.length > 512 || !selectedId.trim()) {
      return json({ error: "invalid_calendar_id" }, 400);
    }
    const selected = calendars.find((c) => c.id === selectedId);
    if (!selected) return json({ error: "calendar_not_in_google_account" }, 403);
    if (!writable(selected)) return json({ error: "calendar_read_only" }, 403);

    const unchanged = integration?.selected_calendar_id === selectedId && integration?.status === "connected";
    if (!unchanged) {
      const { error: saveError } = await admin.from("booking_calendar_integrations").upsert({
        contractor_id: contractorId, provider: "google", selected_calendar_id: selectedId,
        sync_read_busy: true, sync_write_events: true, status: "pending_sync",
      }, { onConflict: "contractor_id,provider" });
      if (saveError) return json({ error: "calendar_selection_save_failed" }, 503);
      // Old cached busy windows must not masquerade as those of the newly selected calendar.
      const { error: clearError } = await admin.from("calendar_busy_periods")
        .delete().eq("calendar_connection_id", connection.id);
      if (clearError) return json({ error: "calendar_cache_clear_failed", selection_saved: true }, 503);
    }
    return json({ connected: true, selected_id: selectedId, selection_status: unchanged ? "connected" : "pending_sync" });
  } catch (error) {
    return json({ error: error instanceof CalendarAuthRevoked ? "google_connection_revoked" : "calendar_list_unavailable" },
      error instanceof CalendarAuthRevoked ? 409 : 503);
  }
});

/**
 * calendar-freebusy-sync — imports real busy windows from the signed-in
 * contractor's connected calendars.
 *
 * Only busy windows are stored. Event titles, guests and descriptions are
 * never requested, never logged and never persisted.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  CalendarAuthRevoked,
  fetchGoogleBusy,
  getGoogleAccessToken,
  parseIcsBusyWindows,
  type BusyWindow,
} from "../_shared/googleCalendar.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_DAYS = 45;
const MAX_DAYS = 120;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "unauthorized" }, 401);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ error: "unauthorized" }, 401);

    let days = DEFAULT_DAYS;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({})) as { days?: unknown };
      const parsed = Number(body.days);
      if (Number.isFinite(parsed) && parsed > 0) days = Math.min(Math.floor(parsed), MAX_DAYS);
    }

    const from = new Date();
    const to = new Date(from.getTime() + days * 86_400_000);
    const secret = Deno.env.get("CALENDAR_TOKEN_ENCRYPTION_KEY") ||
      Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET") || "";

    const { data: connections, error: connectionsError } = await admin
      .from("calendar_connections")
      .select("id, user_id, provider, access_token_encrypted, refresh_token_encrypted, expires_at, external_ics_url, connection_status")
      .eq("user_id", user.id)
      .in("connection_status", ["connected", "subscribed_external"]);

    if (connectionsError) {
      console.error("calendar_connections read failed", { code: connectionsError.code });
      return json({ error: "connections_unavailable" }, 500);
    }
    if (!connections?.length) return json({ synced: false, reason: "no_connection", results: [] });

    const results: Array<{ provider: string; status: string; imported: number; reason?: string }> = [];

    for (const connection of connections) {
      const startedAt = new Date().toISOString();
      let windows: BusyWindow[] = [];
      try {
        if (connection.provider === "google") {
          const accessToken = await getGoogleAccessToken(admin, connection, secret);
          windows = await fetchGoogleBusy(accessToken, from.toISOString(), to.toISOString());
        } else if (connection.external_ics_url) {
          const res = await fetch(connection.external_ics_url, { redirect: "follow" });
          if (!res.ok) throw new Error(`ics_fetch_failed:${res.status}`);
          windows = parseIcsBusyWindows(await res.text(), from, to);
        } else {
          results.push({ provider: connection.provider, status: "skipped", imported: 0, reason: "no_busy_source" });
          continue;
        }
      } catch (error) {
        const revoked = error instanceof CalendarAuthRevoked;
        const message = error instanceof Error ? error.message : "calendar_sync_failed";
        console.error("calendar sync failed", { provider: connection.provider, message });

        await admin.from("calendar_connections").update({
          connection_status: revoked ? "revoked" : connection.connection_status,
          last_error_message: message.slice(0, 300),
        }).eq("id", connection.id);

        await admin.from("calendar_sync_logs").insert({
          calendar_connection_id: connection.id,
          sync_type: "freebusy",
          sync_status: "failed",
          started_at: startedAt,
          ended_at: new Date().toISOString(),
          records_imported: 0,
          error_message: message.slice(0, 300),
        });

        await admin.from("calendar_conversion_events").insert({
          user_id: user.id,
          role_context: "contractor",
          surface: "freebusy_sync",
          provider: connection.provider,
          event_type: "contractor_calendar_sync_failed",
          metadata: { revoked },
        });

        results.push({
          provider: connection.provider,
          status: revoked ? "revoked" : "failed",
          imported: 0,
          reason: revoked ? "reconnect_required" : "sync_failed",
        });
        continue;
      }

      // Replace the cached window for this connection in one pass.
      await admin.from("calendar_busy_periods")
        .delete()
        .eq("calendar_connection_id", connection.id)
        .gte("ends_at", from.toISOString());

      if (windows.length) {
        const rows = windows.map((w) => ({
          calendar_connection_id: connection.id,
          user_id: user.id,
          provider: connection.provider,
          starts_at: w.start,
          ends_at: w.end,
          synced_at: new Date().toISOString(),
        }));
        const { error: insertError } = await admin.from("calendar_busy_periods").insert(rows);
        if (insertError) {
          console.error("busy period persistence failed", { code: insertError.code });
          return json({ error: "busy_persistence_failed", details: insertError.message }, 500);
        }
      }

      await admin.from("calendar_connections").update({
        last_synced_at: new Date().toISOString(),
        last_error_message: null,
      }).eq("id", connection.id);

      await admin.from("calendar_sync_logs").insert({
        calendar_connection_id: connection.id,
        sync_type: "freebusy",
        sync_status: "success",
        started_at: startedAt,
        ended_at: new Date().toISOString(),
        records_imported: windows.length,
      });

      results.push({ provider: connection.provider, status: "success", imported: windows.length });
    }

    return json({
      synced: results.some((r) => r.status === "success"),
      window_days: days,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("calendar-freebusy-sync error", message);
    return json({ error: "sync_failed", details: message }, 500);
  }
});

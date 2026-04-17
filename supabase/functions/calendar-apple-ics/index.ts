// Edge Function: calendar-apple-ics
// Generates / serves an ICS feed by token (public read, no auth).
// On POST with auth: generates a unique ics_token for the user and returns webcal URL.
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  // GET with token → serve ICS feed
  if (req.method === "GET" && token) {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: conn } = await admin
      .from("calendar_connections")
      .select("user_id, provider_account_email")
      .eq("ics_token", token)
      .eq("provider", "apple")
      .maybeSingle();

    if (!conn) return new Response("Not found", { status: 404 });

    // Minimal valid ICS — events come from bookings later
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//UNPRO//Calendar Feed//EN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:UNPRO Rendez-vous",
      "X-WR-TIMEZONE:America/Toronto",
      "END:VCALENDAR",
    ].join("\r\n");

    return new Response(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  // POST → create/get token for current user
  if (req.method === "POST") {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const jwt = authHeader.replace("Bearer ", "");
    const { data: cd, error: ce } = await supabase.auth.getClaims(jwt);
    if (ce || !cd?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = cd.claims.sub;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const newToken = crypto.randomUUID().replace(/-/g, "");

    const { data: existing } = await admin
      .from("calendar_connections")
      .select("id, ics_token")
      .eq("user_id", userId)
      .eq("provider", "apple")
      .maybeSingle();

    let icsToken = existing?.ics_token ?? newToken;

    if (existing) {
      await admin
        .from("calendar_connections")
        .update({ connection_status: "subscribed_external", ics_token: icsToken, connected_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await admin.from("calendar_connections").insert({
        user_id: userId,
        provider: "apple",
        connection_status: "subscribed_external",
        ics_token: icsToken,
        is_primary: false,
        connected_at: new Date().toISOString(),
      });
    }

    await admin.from("calendar_conversion_events").insert({
      user_id: userId,
      role_context: "unknown",
      surface: "apple_subscribe",
      provider: "apple",
      event_type: "apple_subscribe_clicked",
      metadata: {},
    });

    const projectRef = Deno.env.get("SUPABASE_URL")!.match(/https:\/\/([^.]+)/)?.[1];
    const httpsUrl = `https://${projectRef}.supabase.co/functions/v1/calendar-apple-ics?token=${icsToken}`;
    const webcalUrl = httpsUrl.replace("https://", "webcal://");

    return json({ webcal_url: webcalUrl, https_url: httpsUrl, ics_token: icsToken }, 200);
  }

  return new Response("Method Not Allowed", { status: 405 });
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

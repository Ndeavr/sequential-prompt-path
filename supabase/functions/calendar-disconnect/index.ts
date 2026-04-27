// Edge Function: calendar-disconnect
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: cd, error: ce } = await (supabase.auth as any).getClaims(token);
    if (ce || !cd?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = cd.claims.sub;

    const body = await req.json().catch(() => ({}));
    const provider = body?.provider as string | undefined;
    if (!provider) return json({ error: "provider required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await admin
      .from("calendar_connections")
      .update({ connection_status: "revoked", access_token_encrypted: null, refresh_token_encrypted: null })
      .eq("user_id", userId)
      .eq("provider", provider);

    await admin.from("calendar_conversion_events").insert({
      user_id: userId,
      role_context: "unknown",
      surface: "settings",
      provider,
      event_type: "calendar_disconnected",
      metadata: {},
    });

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

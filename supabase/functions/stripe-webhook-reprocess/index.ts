// Reprocess a previously-received Stripe webhook event by replaying its stored
// payload against the main stripe-webhook function using an internal replay token.
// Admin-only.
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Admin gate
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData } = await admin.auth.getUser(token);
    const uid = userData?.user?.id;
    if (!uid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const eventIds: string[] = Array.isArray(body.event_ids) ? body.event_ids
      : body.event_id ? [body.event_id] : [];

    if (eventIds.length === 0) {
      return new Response(JSON.stringify({ error: "event_id(s) required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ event_id: string; ok: boolean; error?: string; status?: number }> = [];
    const webhookUrl = `${supabaseUrl}/functions/v1/stripe-webhook`;

    for (const evtId of eventIds) {
      const { data: row, error } = await admin
        .from("stripe_webhook_events")
        .select("stripe_event_id, payload")
        .eq("stripe_event_id", evtId)
        .maybeSingle();

      if (error || !row?.payload) {
        results.push({ event_id: evtId, ok: false, error: error?.message ?? "no payload" });
        continue;
      }

      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-replay-token": serviceKey,
            // Anon key required by the gateway even for functions with verify_jwt=false
            "apikey": Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey,
          },
          body: JSON.stringify(row.payload),
        });
        results.push({ event_id: evtId, ok: res.ok, status: res.status });

        // Best-effort audit
        await admin.from("system_audit_logs").insert({
          action: "stripe.webhook.reprocess",
          actor_id: uid,
          payload: { event_id: evtId, status: res.status, ok: res.ok },
        } as never);
      } catch (e: any) {
        results.push({ event_id: evtId, ok: false, error: String(e?.message ?? e) });
      }
    }

    const okCount = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({ processed: results.length, ok: okCount, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

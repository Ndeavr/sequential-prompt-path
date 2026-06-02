// Founder Verification — run a real live test on each subsystem
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { kind, input } = await req.json();
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

    const t0 = Date.now();
    let target = "";
    let body: any = {};

    switch (kind) {
      case "scrape":
        target = "acq-cascade-scrape";
        body = { trade: input?.trade ?? "isolation", city: input?.city ?? "Laval", limit: 3, enrich: false, dry_run: true };
        break;
      case "aipp":
        target = "aipp-v2-analyze";
        body = { website: input?.website, neq: input?.neq, dry_run: true };
        break;
      case "sms":
        target = "acq-sms-send";
        body = { to: input?.to, message: input?.message ?? "[UNPRO test] ping verification", dry_run: true };
        break;
      case "email":
        target = "edge-check-email-health";
        body = { recipient: input?.recipient };
        break;
      case "stripe":
        target = "acq-create-checkout";
        body = { plan: input?.plan ?? "pro", test: true };
        break;
      default:
        return new Response(JSON.stringify({ error: "unknown kind" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data, error } = await admin.functions.invoke(target, { body });
    const ms = Date.now() - t0;
    const verdict = error ? "red" : "green";

    await admin.from("founder_health_checks").insert({
      module: kind,
      target,
      status: verdict,
      latency_ms: ms,
      error_message: error?.message ?? null,
      probable_cause: error ? "Edge function returned error" : null,
      proposed_fix: error ? `Voir logs ${target}` : null,
      metadata: { live_test: true, input, result_preview: data ? JSON.stringify(data).slice(0, 500) : null },
    });

    return new Response(JSON.stringify({ verdict, latency_ms: ms, target, data, error: error?.message ?? null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

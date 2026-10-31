// UNPRO Demand Intelligence — Create demand signal from a homeowner project
// Idempotent on project_id. Returns waiting position + market context.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const token = req.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return json({ ok: false, error: "unauthorized" }, 401);
    // Existing SQL auto-matcher lacks RBQ/capacity/availability gates. No safe write until repaired.
    return json({ ok: false, error: "verified_matching_and_consent_required" }, 409);
  } catch (e) {
    console.error("demand-signal-create error", e);
    return json({ ok: false, error: "request_unavailable" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

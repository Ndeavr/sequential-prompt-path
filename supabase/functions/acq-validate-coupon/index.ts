import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { code } = await req.json();
    if (!code) throw new Error("code_required");
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: c } = await sb.from("acq_coupons").select("*").eq("code", code).maybeSingle();
    if (!c) return new Response(JSON.stringify({ valid: false, reason: "not_found" }), { headers: { ...cors, "Content-Type": "application/json" } });
    if (!c.active) return new Response(JSON.stringify({ valid: false, reason: "inactive" }), { headers: { ...cors, "Content-Type": "application/json" } });
    if (c.expires_at && new Date(c.expires_at) < new Date()) return new Response(JSON.stringify({ valid: false, reason: "expired" }), { headers: { ...cors, "Content-Type": "application/json" } });
    if (c.redemptions_count >= c.max_redemptions) return new Response(JSON.stringify({ valid: false, reason: "exhausted" }), { headers: { ...cors, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ valid: true, discount_type: c.discount_type, charge_amount: c.min_charge_amount }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});

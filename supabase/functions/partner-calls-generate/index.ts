// UNPRO — Generate next 30 calls for a partner
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: claims, error: ae } = await userClient.auth.getClaims(auth.replace("Bearer ", ""));
    if (ae || !claims?.claims?.sub) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });
    const userId = claims.claims.sub;

    const { data: partner } = await admin.from("partners").select("id").eq("user_id", userId).maybeSingle();
    if (!partner) return new Response(JSON.stringify({ error: "no_partner" }), { status: 404, headers: corsHeaders });

    // Refuse if any todo remaining
    const { count: todoCount } = await admin
      .from("partner_call_assignments")
      .select("*", { count: "exact", head: true })
      .eq("partner_id", partner.id).eq("status", "todo");
    if ((todoCount ?? 0) > 0) {
      return new Response(JSON.stringify({ error: "todo_remaining", remaining: todoCount }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Already-assigned lead ids
    const { data: assigned } = await admin
      .from("partner_call_assignments").select("lead_id").eq("partner_id", partner.id);
    const excluded = (assigned ?? []).map((r: any) => r.lead_id);

    let q = admin.from("entrepreneur_leads").select("id").not("phone", "is", null).order("created_at", { ascending: false }).limit(30);
    if (excluded.length) q = q.not("id", "in", `(${excluded.join(",")})`);
    const { data: leads, error: le } = await q;
    if (le) throw le;
    if (!leads?.length) return new Response(JSON.stringify({ inserted: 0, message: "no_leads_available" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const rows = leads.map((l: any) => ({ partner_id: partner.id, lead_id: l.id, status: "todo" }));
    const { error: ie } = await admin.from("partner_call_assignments").insert(rows);
    if (ie) throw ie;

    return new Response(JSON.stringify({ inserted: rows.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String((e as Error).message) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

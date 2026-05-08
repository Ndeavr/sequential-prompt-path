// UNPRO — Campaign Launch (start / pause / stop)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: jsonHeaders });
  }
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: jsonHeaders });
  }
  const { data: hasRole } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (!hasRole) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: jsonHeaders });
  }

  const { action, segment, prospect_ids, campaign_contact_id } = await req.json();

  if (action === "start") {
    // Pull eligible prospects: have phone, optional email; not yet in campaign_contacts
    let q = supabase.from("contractor_prospects")
      .select("id, business_name, phone, email, website_url, city, trade_category, avg_job_value_cad")
      .not("phone", "is", null);
    if (prospect_ids?.length) q = q.in("id", prospect_ids);
    const { data: pros, error } = await q.limit(200);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

    let inserted = 0, skipped = 0;
    for (const p of pros ?? []) {
      const seg = (p.email && p.website_url) ? "C" : (p.website_url) ? "B" : "A";
      if (segment && segment !== "all" && segment !== seg) { skipped++; continue; }
      const { error: insErr } = await supabase.from("campaign_contacts").insert({
        prospect_id: p.id,
        company_name: p.business_name,
        phone: p.phone,
        email: p.email,
        segment: seg,
        status: "active",
        sequence_started_at: new Date().toISOString(),
        scheduled_next_at: new Date().toISOString(),
        lost_revenue_monthly: p.avg_job_value_cad ? Math.round(p.avg_job_value_cad * 0.4) : null,
      });
      if (insErr) skipped++; else inserted++;
    }
    return new Response(JSON.stringify({ inserted, skipped }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (action === "pause" && campaign_contact_id) {
    await supabase.from("campaign_contacts").update({ status: "paused" }).eq("id", campaign_contact_id);
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }
  if (action === "stop" && campaign_contact_id) {
    await supabase.from("campaign_contacts").update({ status: "opted_out", opted_out: true, opted_out_at: new Date().toISOString() }).eq("id", campaign_contact_id);
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }
  if (action === "pause_all") {
    await supabase.from("campaign_settings").update({ paused_globally: true }).eq("id", 1);
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }
  if (action === "resume_all") {
    await supabase.from("campaign_settings").update({ paused_globally: false }).eq("id", 1);
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: corsHeaders });
});

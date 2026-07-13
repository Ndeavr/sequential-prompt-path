// Resolves a landing_token → prospect view model for /invitation/:token
// Public (no auth). Logs landing_viewed and updates funnel_status.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const token: string | undefined = body?.token;
    if (!token) return json({ error: "missing_token" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: prospect, error } = await supabase
      .from("prospects")
      .select("id, business_name, main_city, region_name, telephone, email, url_google, service, domaine, funnel_status, contractor_id, activation_paid_at, recommendable, source, campaign_id, prenom, nom")
      .eq("landing_token", token)
      .maybeSingle();

    if (error || !prospect) return json({ error: "not_found" }, 404);

    // Log landing_viewed once (upgrade path only)
    const upgradeOrder = ["scraped","needs_validation","ready_to_contact","sms_queued","sms_sent","sms_delivered","sms_clicked","landing_viewed"];
    const currentIdx = upgradeOrder.indexOf(prospect.funnel_status ?? "scraped");
    const targetIdx = upgradeOrder.indexOf("landing_viewed");
    if (currentIdx >= 0 && currentIdx < targetIdx) {
      await supabase.from("prospects").update({ funnel_status: "landing_viewed" }).eq("id", prospect.id);
    }
    // Best-effort page event log
    await supabase.from("outreach_page_events").insert({
      prospect_id: prospect.id,
      event_name: "landing_viewed",
      page_path: `/invitation/${token}`,
      metadata: { token },
    } as never).then(() => {}, () => {});

    return json({
      prospect: {
        id: prospect.id,
        business_name: prospect.business_name,
        city: prospect.main_city,
        region: prospect.region_name,
        phone: prospect.telephone,
        email: prospect.email,
        website: prospect.url_google,
        category: prospect.service ?? prospect.domaine,
        contact_name: [prospect.prenom, prospect.nom].filter(Boolean).join(" ") || null,
        source: prospect.source,
        funnel_status: prospect.funnel_status,
        already_paid: !!prospect.activation_paid_at,
        recommendable: !!prospect.recommendable,
        contractor_id: prospect.contractor_id,
      },
    });
  } catch (e: any) {
    console.error("[invitation-resolve]", e?.message || e);
    return json({ error: "internal_error" }, 500);
  }
});

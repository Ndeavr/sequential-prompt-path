// Short link resolver: /r/:token → { landing_token }
// Logs click event + updates outreach_messages.clicked_at + prospect funnel_status.
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

    const { data: msg } = await supabase
      .from("outreach_messages")
      .select("id, prospect_id, campaign_id, clicked_at")
      .eq("short_link_token", token)
      .maybeSingle();

    if (!msg) return json({ error: "not_found" }, 404);

    const nowIso = new Date().toISOString();

    if (!msg.clicked_at) {
      await supabase.from("outreach_messages").update({ clicked_at: nowIso }).eq("id", msg.id);
    }

    // Log click event (best-effort)
    await supabase.from("outreach_click_events").insert({
      prospect_id: msg.prospect_id,
      campaign_id: msg.campaign_id,
      message_id: msg.id,
      clicked_at: nowIso,
      user_agent: req.headers.get("user-agent") ?? null,
    } as never).then(() => {}, () => {});

    // Resolve landing_token
    let landingToken: string | null = null;
    if (msg.prospect_id) {
      const { data: p } = await supabase
        .from("prospects")
        .select("landing_token, funnel_status")
        .eq("id", msg.prospect_id)
        .maybeSingle();
      landingToken = p?.landing_token ?? null;

      const upstream = ["scraped","needs_validation","ready_to_contact","sms_queued","sms_sent","sms_delivered"];
      if (p && upstream.includes(p.funnel_status ?? "scraped")) {
        await supabase.from("prospects").update({ funnel_status: "sms_clicked" }).eq("id", msg.prospect_id);
      }
    }

    return json({ landing_token: landingToken });
  } catch (e: any) {
    console.error("[outreach-shortlink-resolve]", e?.message || e);
    return json({ error: "internal_error" }, 500);
  }
});

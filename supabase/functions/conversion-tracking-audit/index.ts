// Detects tracking gaps: sms_delivered without link_clicked, link_clicked without landing_view.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function normalizePhone(p: string | null | undefined): string | null {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d.startsWith("1")) return "+" + d;
  return p.startsWith("+") ? p : (d ? "+" + d : null);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user?.id) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const since = new Date(Date.now() - 30 * 86400_000).toISOString();

    const [sms, events] = await Promise.all([
      admin.from("sms_events_v2")
        .select("normalized_phone,raw_phone,delivered_at,sent_at")
        .gte("created_at", since)
        .limit(20000),
      admin.from("contractor_funnel_events")
        .select("phone,event_type,created_at")
        .in("event_type", ["sms_clicked", "link_clicked", "landing_view", "landing_viewed"])
        .gte("created_at", since)
        .limit(50000),
    ]);

    const clickPhones = new Set<string>();
    const viewPhones = new Set<string>();
    for (const e of events.data ?? []) {
      const p = normalizePhone(e.phone);
      if (!p) continue;
      if (["sms_clicked", "link_clicked"].includes(e.event_type)) clickPhones.add(p);
      if (["landing_view", "landing_viewed"].includes(e.event_type)) viewPhones.add(p);
    }

    let delivered = 0, deliveredNoClick = 0, clickNoView = 0;
    const seen = new Set<string>();
    for (const s of sms.data ?? []) {
      const p = normalizePhone(s.normalized_phone ?? s.raw_phone);
      if (!p || !s.delivered_at || seen.has(p)) continue;
      seen.add(p);
      delivered++;
      if (!clickPhones.has(p)) deliveredNoClick++;
    }
    for (const p of clickPhones) {
      if (!viewPhones.has(p)) clickNoView++;
    }

    const flags: string[] = [];
    if (delivered > 0 && deliveredNoClick / delivered > 0.5) flags.push("TRACKING_MISMATCH: >50% des SMS livrés n'ont pas d'événement link_clicked");
    if (clickPhones.size > 0 && clickNoView / clickPhones.size > 0.3) flags.push("TRACKING_MISMATCH: >30% des clics n'ont pas de landing_view");

    return json({
      delivered_total: delivered,
      delivered_no_click: deliveredNoClick,
      clicks_total: clickPhones.size,
      click_no_view: clickNoView,
      flags,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

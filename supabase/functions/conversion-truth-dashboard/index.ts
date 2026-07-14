// /admin/conversion-truth — READ-ONLY aggregation for the conversion sprint.
// Reuses launch_leads + sms_events_v2 + contractor_funnel_events + lead_funnel_sessions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const STEPS = [
  "scraped",
  "mobile_valid",
  "sms_sent",
  "sms_delivered",
  "link_clicked",
  "landing_view",
  "landing_visible_3s",
  "cta_clicked",
  "alex_started",
  "signup_started",
  "signup_completed",
  "checkout_opened",
  "stripe_success",
  "account_activated",
] as const;
type Step = typeof STEPS[number];

const EVENT_MAP: Record<string, string[]> = {
  link_clicked: ["sms_clicked", "link_clicked"],
  landing_view: ["landing_view", "landing_viewed"],
  alex_started: ["alex_started"],
  signup_started: ["registration_started", "signup_started"],
  signup_completed: ["registration_completed", "signup_completed"],
  checkout_opened: ["stripe_checkout_opened", "stripe_checkout_started", "checkout_opened", "checkout_started"],
  stripe_success: ["stripe_payment_success", "payment_completed"],
  account_activated: ["activation_completed", "activation_viewed"],
};

function normalizePhone(p: string | null | undefined): string | null {
  if (!p) return null;
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return "+1" + d;
  if (d.length === 11 && d.startsWith("1")) return "+" + d;
  if (p.startsWith("+")) return p;
  return d ? "+" + d : null;
}
function isMobile(p: string | null | undefined): boolean {
  if (!p) return false;
  const d = p.replace(/\D/g, "");
  const local = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return local.length === 10 && /^[2-9]\d{9}$/.test(local);
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const REASONS: Record<string, string> = {
  mobile_valid: "Numéro non mobile ou invalide",
  sms_sent: "SMS non envoyé par Twilio",
  sms_delivered: "SMS envoyé mais non livré (webhook Twilio absent)",
  link_clicked: "Lien SMS jamais cliqué",
  landing_view: "Clic sans landing_view (tracking front cassé)",
  landing_visible_3s: "Landing quittée en moins de 3 secondes",
  cta_clicked: "Landing vue mais CTA jamais cliqué",
  alex_started: "Alex jamais démarré sur la landing",
  signup_started: "Aucune inscription initiée",
  signup_completed: "Inscription abandonnée",
  checkout_opened: "Checkout Stripe jamais ouvert",
  stripe_success: "Paiement Stripe non complété",
  account_activated: "Compte non activé après paiement",
};

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
    const { data: u, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !u?.user?.id) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const url = new URL(req.url);
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? 30)));
    const limit = Math.min(500, Math.max(10, Number(url.searchParams.get("limit") ?? 200)));
    const since = new Date(Date.now() - days * 86400_000).toISOString();

    const [leadsRes, smsRes, eventsRes, sessionsRes] = await Promise.all([
      admin.from("launch_leads")
        .select("id,phone,company_name,trade,city,failure_code,block_reason,paid_at,activated_at,created_at,lead_status")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(limit),
      admin.from("sms_events_v2")
        .select("normalized_phone,raw_phone,status,error_code,error_message,sent_at,delivered_at,failed_at,created_at,metadata")
        .gte("created_at", since)
        .limit(20000),
      admin.from("contractor_funnel_events")
        .select("phone,event_type,created_at,metadata")
        .gte("created_at", since)
        .limit(50000),
      admin.from("lead_funnel_sessions")
        .select("lead_id,session_id,user_agent,device_type,source,opened_at,time_on_page,scroll_depth,cta_clicked,cta_clicked_at,alex_started,alex_started_at,signup_started,signup_started_at")
        .gte("opened_at", since)
        .limit(20000),
    ]);

    const leads = leadsRes.data ?? [];
    const sms = smsRes.data ?? [];
    const events = eventsRes.data ?? [];
    const sessions = sessionsRes.data ?? [];

    const smsByPhone = new Map<string, any[]>();
    for (const s of sms) {
      const key = normalizePhone(s.normalized_phone ?? s.raw_phone);
      if (!key) continue;
      const arr = smsByPhone.get(key) ?? [];
      arr.push(s);
      smsByPhone.set(key, arr);
    }
    const eventsByPhone = new Map<string, any[]>();
    for (const e of events) {
      const key = normalizePhone(e.phone);
      if (!key) continue;
      const arr = eventsByPhone.get(key) ?? [];
      arr.push(e);
      eventsByPhone.set(key, arr);
    }
    const sessionsByLead = new Map<string, any[]>();
    for (const s of sessions) {
      if (!s.lead_id) continue;
      const arr = sessionsByLead.get(s.lead_id) ?? [];
      arr.push(s);
      sessionsByLead.set(s.lead_id, arr);
    }

    const output = leads.map((l: any) => {
      const phone = normalizePhone(l.phone);
      const smsRows = phone ? smsByPhone.get(phone) ?? [] : [];
      const evRows = phone ? eventsByPhone.get(phone) ?? [] : [];
      const sessRows = sessionsByLead.get(l.id) ?? [];
      const bestSess = sessRows.sort((a, b) => (b.time_on_page ?? 0) - (a.time_on_page ?? 0))[0];

      const steps: Record<string, { at: string | null; ok: boolean; error?: string | null }> = {};
      steps.scraped = { at: l.created_at, ok: true };
      steps.mobile_valid = { at: l.created_at, ok: isMobile(l.phone) };

      const smsSent = smsRows.find((s) => s.sent_at)?.sent_at ?? null;
      const smsDelivered = smsRows.find((s) => s.delivered_at)?.delivered_at ?? null;
      const smsFailed = smsRows.find((s) => s.failed_at);
      steps.sms_sent = { at: smsSent, ok: !!smsSent, error: smsFailed?.error_code ?? null };
      steps.sms_delivered = { at: smsDelivered, ok: !!smsDelivered, error: smsFailed?.error_message ?? null };

      for (const step of ["link_clicked","landing_view","alex_started","signup_started","signup_completed","checkout_opened","stripe_success","account_activated"]) {
        const types = EVENT_MAP[step] ?? [];
        const hit = evRows.filter((e) => types.includes(e.event_type)).sort((a, b) => (a.created_at < b.created_at ? -1 : 1))[0];
        steps[step] = { at: hit?.created_at ?? null, ok: !!hit };
      }
      // Overlay from lead_funnel_sessions
      steps.landing_visible_3s = {
        at: bestSess?.opened_at ?? null,
        ok: !!(bestSess && (bestSess.time_on_page ?? 0) >= 3),
      };
      steps.cta_clicked = {
        at: bestSess?.cta_clicked_at ?? null,
        ok: !!(bestSess?.cta_clicked) || steps.alex_started.ok || steps.signup_started.ok,
      };
      // Overlay from lead source of truth
      if (l.paid_at) steps.stripe_success = { at: l.paid_at, ok: true };
      if (l.activated_at) steps.account_activated = { at: l.activated_at, ok: true };

      let firstBreak: { step: string; reason: string } | null = null;
      for (const s of STEPS) {
        if (!steps[s].ok) {
          firstBreak = { step: s, reason: steps[s].error || REASONS[s] || "Événement absent" };
          break;
        }
      }

      return {
        lead_id: l.id,
        phone,
        company_name: l.company_name,
        category: l.trade,
        city: l.city,
        lead_status: l.lead_status,
        failure_code: l.failure_code,
        device_type: bestSess?.device_type ?? null,
        session_id: bestSess?.session_id ?? null,
        source: bestSess?.source ?? null,
        steps,
        first_break: firstBreak,
      };
    });

    output.sort((a, b) => {
      const score = (r: any) => STEPS.filter((s) => r.steps[s]?.ok).length;
      return score(b) - score(a);
    });

    // KPIs
    const kpi = {
      leads: output.length,
      sms_delivered: output.filter((o) => o.steps.sms_delivered.ok).length,
      landing_views: output.filter((o) => o.steps.landing_view.ok).length,
      alex_starts: output.filter((o) => o.steps.alex_started.ok).length,
      signups: output.filter((o) => o.steps.signup_completed.ok).length,
      checkouts: output.filter((o) => o.steps.checkout_opened.ok).length,
      paid_activations: output.filter((o) => o.steps.account_activated.ok).length,
    };

    // Blocker: biggest drop between consecutive steps
    let blocker: { step: string; from: number; to: number; drop_pct: number; label: string } | null = null;
    for (let i = 1; i < STEPS.length; i++) {
      const prev = STEPS[i - 1];
      const cur = STEPS[i];
      const prevCount = output.filter((o) => o.steps[prev]?.ok).length;
      const curCount = output.filter((o) => o.steps[cur]?.ok).length;
      if (prevCount === 0) continue;
      const drop = (prevCount - curCount) / prevCount;
      if (!blocker || drop > blocker.drop_pct) {
        blocker = {
          step: cur,
          from: prevCount,
          to: curCount,
          drop_pct: drop,
          label: `${REASONS[cur] ?? cur} — ${Math.round(drop * 100)}% des leads perdus après ${prev}`,
        };
      }
    }

    // Tracking mismatch: sms_delivered with no link_clicked
    const mismatch = {
      delivered_no_click: output.filter((o) => o.steps.sms_delivered.ok && !o.steps.link_clicked.ok).length,
      click_no_view: output.filter((o) => o.steps.link_clicked.ok && !o.steps.landing_view.ok).length,
      view_no_session: output.filter((o) => o.steps.landing_view.ok && !o.session_id).length,
    };

    // Variant stats (from sms_events_v2 metadata.variant_key)
    const variantStats: Record<string, { sent: number; delivered: number }> = {};
    for (const s of sms) {
      const key = (s.metadata as any)?.variant_key ?? (s.metadata as any)?.template_key;
      if (!key) continue;
      variantStats[key] ??= { sent: 0, delivered: 0 };
      if (s.sent_at) variantStats[key].sent++;
      if (s.delivered_at) variantStats[key].delivered++;
    }

    return json({
      steps: STEPS,
      window_days: days,
      kpi,
      blocker,
      mismatch,
      variant_stats: variantStats,
      leads: output,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

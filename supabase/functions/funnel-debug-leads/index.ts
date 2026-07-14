// /admin/funnel-debug backend — per-lead step aggregation. READ-ONLY.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const STEPS = [
  "scraped",
  "mobile_valid",
  "sms_queued",
  "sms_sent",
  "sms_delivered",
  "link_clicked",
  "landing_view",
  "alex_started",
  "signup_started",
  "signup_completed",
  "checkout_opened",
  "payment_completed",
  "account_activated",
] as const;
type Step = typeof STEPS[number];

const EVENT_MAP: Record<Step, string[]> = {
  scraped: [],
  mobile_valid: [],
  sms_queued: [],
  sms_sent: [],
  sms_delivered: [],
  link_clicked: ["sms_clicked", "link_clicked"],
  landing_view: ["landing_view", "landing_viewed"],
  alex_started: ["alex_started"],
  signup_started: ["registration_started", "signup_started"],
  signup_completed: ["registration_completed", "signup_completed"],
  checkout_opened: ["stripe_checkout_opened", "stripe_checkout_started", "checkout_opened", "checkout_started"],
  payment_completed: ["stripe_payment_success", "payment_completed"],
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

    const [leadsRes, smsRes, eventsRes] = await Promise.all([
      admin.from("launch_leads")
        .select("id,phone,company_name,trade,city,failure_code,block_reason,paid_at,activated_at,created_at,lead_status")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(limit),
      admin.from("sms_events_v2")
        .select("normalized_phone,raw_phone,status,error_code,error_message,sent_at,delivered_at,failed_at,created_at")
        .gte("created_at", since)
        .limit(20000),
      admin.from("contractor_funnel_events")
        .select("phone,event_type,created_at,metadata")
        .gte("created_at", since)
        .limit(50000),
    ]);

    const leads = leadsRes.data ?? [];
    const sms = smsRes.data ?? [];
    const events = eventsRes.data ?? [];

    // Index SMS + events by normalized phone
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

    const output = leads.map((l: any) => {
      const phone = normalizePhone(l.phone);
      const smsRows = phone ? smsByPhone.get(phone) ?? [] : [];
      const evRows = phone ? eventsByPhone.get(phone) ?? [] : [];
      const steps: Record<string, { at: string | null; ok: boolean; error?: string | null }> = {};

      // scraped: lead exists
      steps.scraped = { at: l.created_at, ok: true };
      // mobile_valid
      steps.mobile_valid = { at: l.created_at, ok: isMobile(l.phone) };

      // SMS
      const smsQueued = smsRows[0]?.created_at ?? null;
      const smsSent = smsRows.find((s) => s.sent_at)?.sent_at ?? null;
      const smsDelivered = smsRows.find((s) => s.delivered_at)?.delivered_at ?? null;
      const smsFailed = smsRows.find((s) => s.failed_at);
      steps.sms_queued = { at: smsQueued, ok: !!smsQueued };
      steps.sms_sent = { at: smsSent, ok: !!smsSent, error: smsFailed?.error_code ?? null };
      steps.sms_delivered = { at: smsDelivered, ok: !!smsDelivered, error: smsFailed?.error_message ?? null };

      // Event-derived steps
      for (const step of ["link_clicked","landing_view","alex_started","signup_started","signup_completed","checkout_opened","payment_completed","account_activated"] as Step[]) {
        const types = EVENT_MAP[step];
        const hit = evRows.filter((e) => types.includes(e.event_type)).sort((a, b) => (a.created_at < b.created_at ? -1 : 1))[0];
        steps[step] = { at: hit?.created_at ?? null, ok: !!hit };
      }
      // Overlay lead.paid_at / activated_at (source of truth on lead)
      if (l.paid_at) steps.payment_completed = { at: l.paid_at, ok: true };
      if (l.activated_at) steps.account_activated = { at: l.activated_at, ok: true };

      // First break
      let firstBreak: { step: string; reason: string } | null = null;
      for (const s of STEPS) {
        if (!steps[s].ok) {
          firstBreak = {
            step: s,
            reason:
              steps[s].error ||
              (s === "mobile_valid" ? "Numéro non mobile ou invalide" :
               s === "sms_queued" ? "Aucun SMS mis en file" :
               s === "sms_sent" ? (l.failure_code || "SMS non envoyé par Twilio") :
               s === "sms_delivered" ? "SMS envoyé mais non livré (statut Twilio manquant)" :
               s === "link_clicked" ? "Lien SMS jamais cliqué" :
               s === "landing_view" ? "Clic sans landing_view (tracking front cassé ?)" :
               s === "alex_started" ? "Alex jamais démarré sur la landing" :
               s === "signup_started" ? "Aucune inscription initiée" :
               s === "signup_completed" ? "Inscription abandonnée" :
               s === "checkout_opened" ? "Checkout Stripe jamais ouvert" :
               s === "payment_completed" ? "Paiement non complété" :
               s === "account_activated" ? "Compte non activé après paiement" :
               "Événement absent"),
          };
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
        steps,
        first_break: firstBreak,
      };
    });

    // Sort: leads with most steps completed first (closer to $)
    output.sort((a, b) => {
      const score = (r: any) => STEPS.filter((s) => r.steps[s]?.ok).length;
      return score(b) - score(a);
    });

    // Totals
    const totals = {
      leads: output.length,
      paid: output.filter((o) => o.steps.payment_completed.ok).length,
      activated: output.filter((o) => o.steps.account_activated.ok).length,
    };

    return json({ steps: STEPS, totals, leads: output, window_days: days });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

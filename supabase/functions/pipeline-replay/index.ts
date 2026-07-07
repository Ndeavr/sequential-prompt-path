// pipeline-replay — inspects a prospect through every stage of the revenue pipeline
// and returns per-node status. No side effects. Never returns generic "Failed".
// POST { prospect_id?: string, phone?: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Node = {
  step: string;
  status: "ok" | "fail" | "skip";
  reason: string;
  payload: unknown;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { prospect_id, phone } = await req.json().catch(() => ({}));
    let prospect: any = null;
    if (prospect_id) {
      ({ data: prospect } = await sb.from("contractor_prospects").select("*").eq("id", prospect_id).maybeSingle());
    } else if (phone) {
      ({ data: prospect } = await sb.from("contractor_prospects").select("*").eq("phone", phone).maybeSingle());
    }
    if (!prospect) {
      return new Response(JSON.stringify({ ok: false, error: "prospect_not_found" }), { status: 404, headers: { ...cors, "content-type": "application/json" } });
    }

    const nodes: Node[] = [];

    nodes.push({
      step: "SCRAPE",
      status: "ok",
      reason: `Trouvé dans contractor_prospects le ${prospect.created_at}`,
      payload: { id: prospect.id, business_name: prospect.business_name, city: prospect.city, source: prospect.source ?? null },
    });

    nodes.push({
      step: "ENRICH",
      status: prospect.phone || prospect.email ? "ok" : "fail",
      reason: prospect.phone ? `phone=${prospect.phone}` : prospect.email ? `email=${prospect.email}` : "no_contact_info",
      payload: { phone: prospect.phone, email: prospect.email, website: prospect.website },
    });

    nodes.push({
      step: "SCORE",
      status: prospect.aipp_score != null ? "ok" : "skip",
      reason: prospect.aipp_score != null ? `AIPP ${prospect.aipp_score}` : "aipp_not_computed",
      payload: { aipp_score: prospect.aipp_score ?? null },
    });

    const { data: smsRows } = await sb
      .from("acq_sms_logs")
      .select("id, status, error, provider_message_id, created_at, sent_at, body")
      .eq("recipient_phone", prospect.phone ?? "___none___")
      .order("created_at", { ascending: false })
      .limit(5);
    const lastSms = (smsRows ?? [])[0];
    nodes.push({
      step: "SMS",
      status: lastSms ? (lastSms.error ? "fail" : "ok") : "fail",
      reason: lastSms
        ? lastSms.error
          ? `Twilio error: ${lastSms.error}`
          : `Envoyé (status=${lastSms.status}, sid=${lastSms.provider_message_id ?? "—"})`
        : "no_sms_ever_sent_to_this_phone",
      payload: { last_5_sms: smsRows ?? [] },
    });

    const { data: clicks } = await sb
      .from("click_events")
      .select("id, created_at, url, source")
      .eq("prospect_id", prospect.id)
      .order("created_at", { ascending: false })
      .limit(5);
    nodes.push({
      step: "CLICK",
      status: (clicks ?? []).length ? "ok" : "skip",
      reason: (clicks ?? []).length ? `${clicks!.length} clic(s)` : "no_click_recorded",
      payload: { clicks: clicks ?? [] },
    });

    const { data: onboarding } = await sb
      .from("contractor_activation_events")
      .select("id, event, created_at, metadata")
      .eq("prospect_id", prospect.id)
      .order("created_at", { ascending: false })
      .limit(10);
    nodes.push({
      step: "ONBOARD",
      status: (onboarding ?? []).length ? "ok" : "skip",
      reason: (onboarding ?? []).length ? `${onboarding!.length} événement(s)` : "no_onboarding_event",
      payload: { events: onboarding ?? [] },
    });

    const { data: checkouts } = await sb
      .from("contractor_checkouts")
      .select("id, payment_status, amount_total, stripe_checkout_reference, created_at, paid_at")
      .eq("prospect_id", prospect.id)
      .order("created_at", { ascending: false })
      .limit(5);
    const lastCheckout = (checkouts ?? [])[0];
    nodes.push({
      step: "STRIPE",
      status: lastCheckout ? (lastCheckout.payment_status === "paid" ? "ok" : "fail") : "skip",
      reason: lastCheckout
        ? `checkout ${lastCheckout.payment_status ?? "?"} (${lastCheckout.stripe_checkout_reference ?? "—"})`
        : "no_checkout_created",
      payload: { checkouts: checkouts ?? [] },
    });

    const { data: sub } = await sb
      .from("contractor_subscriptions")
      .select("id, status, created_at, current_period_end")
      .eq("prospect_id", prospect.id)
      .order("created_at", { ascending: false })
      .limit(1);
    nodes.push({
      step: "ACTIVATION",
      status: (sub ?? []).length ? "ok" : "skip",
      reason: (sub ?? [])[0] ? `subscription ${sub![0].status}` : "no_subscription",
      payload: { subscription: sub?.[0] ?? null },
    });

    const failed_at = nodes.find((n) => n.status === "fail")?.step ?? null;
    return new Response(
      JSON.stringify({ ok: !failed_at, prospect_id: prospect.id, failed_at, nodes }, null, 2),
      { headers: { ...cors, "content-type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message) }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
});

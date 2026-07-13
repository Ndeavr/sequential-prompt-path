// UNPRO — Tunnel Reality: single real-SMS E2E test.
// Actions:
//   send   → create ONE test prospect (is_test_e2e=true), send ONE Twilio SMS, log everything
//   status → return the current checklist for a given test id
//   reset  → soft-reset the latest test (mark as reset; excluded from lock check)
// SAFETY:
//   • Hard cap: exactly 1 SMS per call.
//   • Always marks prospect & sms log as is_test_e2e=true → excluded from production KPIs.
//   • Never touches the relance queue.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function newToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 22);
}

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.trim().startsWith("+") && digits.length >= 11) return `+${digits}`;
  return null;
}

async function sendTwilioSms(to: string, body: string): Promise<{ sid?: string; error?: string; status?: string }> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM_NUMBER") ?? Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!sid || !token || !from) return { error: "twilio_env_missing" };
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = btoa(`${sid}:${token}`);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) return { error: data?.message ?? `twilio_${res.status}` };
  return { sid: data?.sid, status: data?.status };
}

type Step =
  | "prospect_created"
  | "sms_accepted"
  | "sms_delivered"
  | "link_clicked"
  | "landing_opened"
  | "account_created"
  | "checkout_opened"
  | "payment_confirmed"
  | "contractor_created"
  | "profile_enriched"
  | "recommendable";

type StepState = "WAITING" | "PASS" | "FAIL" | "BLOCKED";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const action: string = body?.action ?? "status";

  const publicBase = Deno.env.get("PUBLIC_APP_URL") ?? "https://unpro.ca";

  // ==================================================================
  // SEND — create exactly one test prospect + one Twilio SMS
  // ==================================================================
  if (action === "send") {
    const rawPhone: string = (body?.phone ?? "").toString().trim();
    const phone = normalizePhone(rawPhone);
    if (!phone) return json({ ok: false, error: "invalid_phone" }, 400);

    const first_name: string = (body?.first_name ?? "").toString().trim().slice(0, 80);
    const business_name: string = (body?.business_name ?? "Test E2E UNPRO").toString().trim().slice(0, 120);
    const email: string | null = ((body?.email ?? "") + "").trim().slice(0, 180) || null;
    const category: string | null = ((body?.category ?? "") + "").trim().slice(0, 80) || null;
    const city: string | null = ((body?.city ?? "") + "").trim().slice(0, 80) || null;

    const token = newToken();
    const landingUrl = `${publicBase}/invitation/${token}`;

    // 1) Create prospect (is_test_e2e = true)
    const { data: prospect, error: pErr } = await (supabase.from("prospects") as any)
      .insert({
        business_name,
        telephone: phone,
        email,
        prenom: first_name || null,
        service: category,
        domaine: category,
        main_city: city,
        region_name: city,
        langue_preferee: "fr",
        source: "e2e_test",
        funnel_status: "sms_sent",
        funnel_status_updated_at: new Date().toISOString(),
        landing_token: token,
        is_test_e2e: true,
      })
      .select("id")
      .single();

    if (pErr || !prospect) return json({ ok: false, error: pErr?.message ?? "prospect_insert_failed" }, 500);

    // 2) Create test tracking row
    const { data: testRow, error: tErr } = await (supabase.from("tunnel_e2e_tests") as any)
      .insert({
        prospect_id: prospect.id,
        invitation_token: token,
        phone_e164: phone,
        first_name: first_name || null,
        business_name,
        email,
        category,
        city,
        status: "sending",
        last_step: "prospect_created",
        landing_url: landingUrl,
      })
      .select("id")
      .single();
    if (tErr) return json({ ok: false, error: tErr.message }, 500);

    // 3) Compose + send ONE SMS
    const greeting = first_name ? `Bonjour ${first_name}, ` : "Bonjour, ";
    const smsBody =
      `${greeting}test technique UNPRO. Activation entrepreneur 1 $ : ${landingUrl}`;

    const twilio = await sendTwilioSms(phone, smsBody);

    // 4) Log SMS (is_test_e2e=true; is_simulation=false because it's a real send)
    await (supabase.from("acq_sms_logs") as any).insert({
      recipient_phone: phone,
      body: smsBody,
      status: twilio.error ? "failed" : (twilio.status === "delivered" ? "delivered" : "sent"),
      error: twilio.error ?? null,
      provider_message_id: twilio.sid ?? null,
      sent_at: twilio.error ? null : new Date().toISOString(),
      is_simulation: false,
      is_test_e2e: true,
      prospect_id: prospect.id,
      invitation_token: token,
      relance_kind: "e2e_test",
    });

    // 5) Update test row
    await (supabase.from("tunnel_e2e_tests") as any)
      .update({
        provider_message_id: twilio.sid ?? null,
        sms_error: twilio.error ?? null,
        status: twilio.error ? "failed" : "sent",
        last_step: twilio.error ? "sms_accepted_failed" : "sms_accepted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", testRow!.id);

    return json({
      ok: !twilio.error,
      test_id: testRow!.id,
      prospect_id: prospect.id,
      invitation_token: token,
      landing_url: landingUrl,
      sms_sid: twilio.sid ?? null,
      sms_error: twilio.error ?? null,
    });
  }

  // ==================================================================
  // STATUS — checklist for one test id
  // ==================================================================
  if (action === "status") {
    const testId: string | null = body?.test_id ?? null;
    let testRow: any = null;

    if (testId) {
      const { data } = await (supabase.from("tunnel_e2e_tests") as any)
        .select("*").eq("id", testId).maybeSingle();
      testRow = data;
    } else {
      const { data } = await (supabase.from("tunnel_e2e_tests") as any)
        .select("*").is("reset_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      testRow = data;
    }
    if (!testRow) return json({ ok: true, test: null });

    const { data: prospect } = await (supabase.from("prospects") as any)
      .select("id, funnel_status, activation_paid_at, stripe_session_id, contractor_id, recommendable")
      .eq("id", testRow.prospect_id)
      .maybeSingle();

    const { data: smsLog } = await (supabase.from("acq_sms_logs") as any)
      .select("status, error, provider_message_id, sent_at")
      .eq("prospect_id", testRow.prospect_id)
      .eq("is_test_e2e", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let contractorProfile: any = null;
    if (prospect?.contractor_id) {
      const { data } = await (supabase.from("contractor_profiles") as any)
        .select("id, business_name, service, city")
        .eq("contractor_id", prospect.contractor_id)
        .maybeSingle();
      contractorProfile = data;
    }

    const paidFunnels = ["paid_1_dollar", "activated", "recommendable"];
    const registeredFunnels = ["registered", "profile_completed", "checkout_started", ...paidFunnels];
    const clickedFunnels = ["clicked", "landing_viewed", ...registeredFunnels];
    const landingFunnels = ["landing_viewed", ...registeredFunnels];

    const fs: string = prospect?.funnel_status ?? "sms_sent";

    const smsAcceptedFail = testRow.status === "failed" || (smsLog?.status === "failed");
    const smsAccepted: StepState = testRow.provider_message_id
      ? "PASS"
      : smsAcceptedFail ? "FAIL" : "WAITING";

    const smsDelivered: StepState = smsLog?.status === "delivered"
      ? "PASS"
      : smsLog?.status === "failed" ? "FAIL"
      : smsAccepted === "PASS" ? "WAITING" : "BLOCKED";

    const linkClicked: StepState = clickedFunnels.includes(fs) ? "PASS" : "WAITING";
    const landingOpened: StepState = landingFunnels.includes(fs) ? "PASS" : linkClicked === "PASS" ? "WAITING" : "WAITING";
    const accountCreated: StepState = registeredFunnels.includes(fs) ? "PASS" : "WAITING";
    const checkoutOpened: StepState = (prospect?.stripe_session_id || ["checkout_started", ...paidFunnels].includes(fs))
      ? "PASS" : "WAITING";
    const paymentConfirmed: StepState = prospect?.activation_paid_at ? "PASS" : "WAITING";
    const contractorCreated: StepState = prospect?.contractor_id ? "PASS" : paymentConfirmed === "PASS" ? "WAITING" : "WAITING";
    const profileEnriched: StepState = contractorProfile ? "PASS" : contractorCreated === "PASS" ? "WAITING" : "WAITING";
    const recommendable: StepState = prospect?.recommendable ? "PASS" : "WAITING";

    const steps: Array<{ key: Step; label: string; state: StepState }> = [
      { key: "prospect_created", label: "Prospect créé", state: prospect ? "PASS" : "FAIL" },
      { key: "sms_accepted", label: "SMS accepté par Twilio", state: smsAccepted },
      { key: "sms_delivered", label: "SMS livré", state: smsDelivered },
      { key: "link_clicked", label: "Lien cliqué", state: linkClicked },
      { key: "landing_opened", label: "Landing ouverte", state: landingOpened },
      { key: "account_created", label: "Compte créé", state: accountCreated },
      { key: "checkout_opened", label: "Checkout Stripe ouvert", state: checkoutOpened },
      { key: "payment_confirmed", label: "Paiement confirmé", state: paymentConfirmed },
      { key: "contractor_created", label: "Entrepreneur créé", state: contractorCreated },
      { key: "profile_enriched", label: "Profil enrichi", state: profileEnriched },
      { key: "recommendable", label: "Recommandable par Alex", state: recommendable },
    ];

    const allPass = steps.every((s) => s.state === "PASS");
    const anyFail = steps.some((s) => s.state === "FAIL");
    const overall: "PASS" | "FAIL" | "IN_PROGRESS" = allPass ? "PASS" : anyFail ? "FAIL" : "IN_PROGRESS";

    // Persist overall PASS transition on the test row for locking logic.
    if (allPass && testRow.status !== "pass") {
      await (supabase.from("tunnel_e2e_tests") as any)
        .update({ status: "pass", last_step: "recommendable", updated_at: new Date().toISOString() })
        .eq("id", testRow.id);
    }

    return json({
      ok: true,
      test: {
        id: testRow.id,
        prospect_id: testRow.prospect_id,
        invitation_token: testRow.invitation_token,
        landing_url: testRow.landing_url,
        phone_e164: testRow.phone_e164,
        first_name: testRow.first_name,
        business_name: testRow.business_name,
        email: testRow.email,
        category: testRow.category,
        city: testRow.city,
        sms_sid: testRow.provider_message_id,
        sms_error: testRow.sms_error,
        created_at: testRow.created_at,
        status: testRow.status,
        overall,
        steps,
      },
    });
  }

  // ==================================================================
  // GATE — is the real-send button unlocked?
  // ==================================================================
  if (action === "gate") {
    const { data } = await (supabase.from("tunnel_e2e_tests") as any)
      .select("id, status, created_at")
      .is("reset_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return json({ ok: true, gate_pass: data?.status === "pass", last: data ?? null });
  }

  // ==================================================================
  // RESET — mark the latest test as reset (does not delete data)
  // ==================================================================
  if (action === "reset") {
    const testId: string | null = body?.test_id ?? null;
    let q: any = (supabase.from("tunnel_e2e_tests") as any).update({
      reset_at: new Date().toISOString(),
      status: "reset",
      updated_at: new Date().toISOString(),
    });
    if (testId) q = q.eq("id", testId);
    else q = q.is("reset_at", null).order("created_at", { ascending: false }).limit(1);
    const { error } = await q;
    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true });
  }

  return json({ ok: false, error: "unknown_action" }, 400);
});

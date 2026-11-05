// Real End-to-End Outreach self-test — 14 steps that actually exercise each
// integration. Stops at the first failure, marks the rest skipped, and returns
// `failed_step` so the cockpit can show exactly what broke and how to fix it.
//
// Honesty contract (2026-10-21 fix):
//  - The tracked link + synthetic contractor PERSIST as labeled QA fixtures with
//    an explicit expiration (metadata.e2e_expires_at, 7 days) so a human can
//    validate the real click path. Cleanup is deferred and targeted: each run
//    purges ONLY expired fixtures it owns (campaign __e2e_real / synthetic
//    markers). Real prospects are never touched.
//  - The destination is a real, resolvable, clearly-labeled QA fixture page
//    (qa-e2e-fixture), verified by content marker — not just HTTP 200.
//  - The click path is exercised ANONYMOUSLY (anon key + public resolver),
//    exactly like a recipient's phone — never with the service role.
//  - Delivery states are honest: email "sent" = provider-accepted (labeled as
//    such); SMS passes only on Twilio-confirmed delivered — queued/sent fail.
//  - Stripe step requires a TEST key and creates/retrieves/expires a real TEST
//    Checkout Session. Connectivity NEVER proves a signed payment E2E pass.
//  - Funnel verification fails when 0 events carry the run_group.
//  - cleanup_completed is true only when the deferred-cleanup stamp is verified.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { smsDeliveryConfirmed, funnelIncrementConfirmed, testPaymentProofOk } from "./assertions.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
// Normalize Twilio sender to strict E.164. Twilio rejects "4501234567" or "14501234567"
// — must start with "+". Auto-prepend "+" (and "+1" for 10-digit NANP) so a slightly
// malformed secret still works.
function normalizeE164(raw: string): string {
  const v = (raw ?? "").trim();
  if (!v) return "";
  if (v.startsWith("+")) return v;
  const digits = v.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}
const TWILIO_FROM = normalizeE164(Deno.env.get("TWILIO_PHONE_NUMBER") ?? "");
// Only an explicitly configured internal test destination is ever used.
// No magic-number fallback (it can never deliver) and never a prospect number.
const TWILIO_TEST_TO = normalizeE164(Deno.env.get("TWILIO_TEST_TO") ?? Deno.env.get("ADMIN_TEST_PHONE") ?? "");
const TWILIO_MSG_SVC = (Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") ?? "").trim();
// Canonical signed status callback (same as _shared/twilioSend.ts) so the real
// Twilio delivery webhook records this test SMS in sms_events_v2 — canonical
// evidence, never a synthetic health update.
const SMS_STATUS_CALLBACK_SECRET = Deno.env.get("SMS_STATUS_CALLBACK_SECRET") ?? "";
const SIGNED_STATUS_CALLBACK_URL = SMS_STATUS_CALLBACK_SECRET
  ? `${SUPABASE_URL}/functions/v1/twilio-status-v2?token=${encodeURIComponent(SMS_STATUS_CALLBACK_SECRET)}`
  : "";
// The tracked link must point at the real public frontend QA page; the test
// verifies that exact destination (redirect target + deployed route marker).
const PUBLIC_SITE = "https://unpro.ca";
const QA_ROUTE_MARKER = "UNPRO-QA-E2E-FIXTURE-V1";
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
// TEST-mode key only. A live key is refused: this selftest must never touch live mode.
const STRIPE_TEST_KEY = Deno.env.get("STRIPE_TEST_SECRET_KEY") ?? (STRIPE_KEY.startsWith("sk_test_") ? STRIPE_KEY : "");
const FOUNDER_EMAIL = Deno.env.get("FOUNDER_EMAIL") ?? "danny@unpro.ca";

const FIXTURE_RETENTION_DAYS = 7;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

type StepStatus = "not_run" | "pass" | "fail" | "skipped";
interface StepResult {
  index: number;
  step: string;
  status: StepStatus;
  duration_ms: number;
  error?: string;
  repair?: string;
  payload?: Record<string, unknown>;
}

const STEPS = [
  "create_synthetic_contractor",
  "enrich_contact",
  "generate_tracked_cta",
  "generate_outreach",
  "send_email",
  "verify_email_delivered",
  "send_sms",
  "verify_sms_delivered",
  "click_tracked_cta",
  "verify_click_event",
  "load_landing_page",
  "stripe_test_checkout",
  "verify_funnel_increment",
  "cleanup",
] as const;

async function logStep(run_group: string, r: StepResult) {
  await sb.from("outreach_e2e_full_runs").insert({
    run_group, step_index: r.index, step: r.step, step_status: r.status === "not_run" ? "skipped" : r.status,
    step_payload: r.payload ?? {}, duration_ms: r.duration_ms,
    error: r.error ?? null,
  });
}

// Deferred, targeted purge: delete ONLY expired fixtures owned by this selftest.
// Runs at the start of every invocation; never touches real prospects or links.
async function purgeExpiredFixtures() {
  const nowIso = new Date().toISOString();
  await sb.from("acquisition_tracking_links").delete()
    .eq("campaign", "__e2e_real")
    .lt("metadata->>e2e_expires_at", nowIso);
  await sb.from("contractors").delete()
    .eq("account_status", "test")
    .eq("onboarding_status", "synthetic")
    .like("business_name", "E2E __e2e_%")
    .lt("created_at", new Date(Date.now() - FIXTURE_RETENTION_DAYS * 864e5).toISOString());
}

// Phase B — verify a completed TEST payment for a previous run and, only when
// every proof is real, record the summary pass the gate reads. Proofs required:
//  1. steps 0-10 of that run all passed (read back from outreach_e2e_full_runs);
//  2. Stripe readback: the run's own session is paid/complete, livemode=false,
//     exactly 100 CAD, metadata.run_group + e2e matching;
//  3. stripe_webhook_events holds a checkout.session.completed row for that
//     exact session with livemode=false — inserted only after real Stripe
//     signature verification by stripe-webhook;
//  4. run_group-tagged funnel events exist;
//  5. the QA fixture carries its deferred-cleanup expiration stamp.
async function verifyPaymentPhase(run_group: string) {
  const fail = (error: string, extra: Record<string, unknown> = {}) =>
    new Response(JSON.stringify({ run_group, pass: false, phase: "verify_payment", error, ...extra }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } });

  if (!STRIPE_TEST_KEY.startsWith("sk_test_")) return fail("no Stripe TEST key available");

  const { data: steps } = await sb.from("outreach_e2e_full_runs")
    .select("step,step_status,step_payload").eq("run_group", run_group).neq("step", "summary");
  if (!steps?.length) return fail("unknown run_group — no steps recorded");
  const byStep = new Map(steps.map((s: any) => [s.step, s]));
  const notPassed = STEPS.slice(0, 11).filter((name) => (byStep.get(name) as any)?.step_status !== "pass");
  if (notPassed.length) return fail(`prior run incomplete: steps not passed: ${notPassed.join(",")}`);
  const sessionId = (byStep.get("stripe_test_checkout") as any)?.step_payload?.session_id as string | undefined;
  if (!sessionId) return fail("prior run has no stripe session_id");

  const auth = { Authorization: `Bearer ${STRIPE_TEST_KEY}` };
  const got = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, { headers: auth });
  const session = await got.json().catch(() => null);
  if (!got.ok || !session) return fail(`Stripe retrieve HTTP ${got.status}`);

  const { data: webhookRow } = await sb.from("stripe_webhook_events")
    .select("id,stripe_event_id,event_type,session_id,livemode,success,received_at")
    .eq("event_type", "checkout.session.completed").eq("session_id", sessionId).eq("livemode", false)
    .order("received_at", { ascending: false }).limit(1).maybeSingle();

  if (!testPaymentProofOk(session as any, webhookRow as any, { run_group, session_id: sessionId })) {
    return fail(paymentProofPendingReason(session as any, webhookRow as any), {
      session_status: (session as any)?.status ?? null,
      payment_status: (session as any)?.payment_status ?? null,
      livemode: (session as any)?.livemode ?? null,
      webhook_received: Boolean(webhookRow),
    });
  }

  const { count } = await sb.from("acquisition_events").select("id", { count: "exact", head: true })
    .contains("metadata", { run_group } as any);
  if (!funnelIncrementConfirmed(count)) return fail("0 acquisition_events carry this run_group");

  const { data: link } = await sb.from("acquisition_tracking_links").select("id,metadata")
    .eq("campaign", "__e2e_real").contains("metadata", { run_group } as any).limit(1).maybeSingle();
  const stamped = Boolean((link as any)?.metadata?.e2e_expires_at);
  if (!stamped) return fail("QA fixture missing deferred-cleanup expiration stamp");

  await sb.from("outreach_e2e_full_runs").insert({
    run_group, step_index: 99, step: "summary", step_status: "pass", pass: true,
    cleanup_completed: true,
    step_payload: {
      two_phase: true, verified_at: new Date().toISOString(),
      stripe_session_id: sessionId, stripe_event_id: (webhookRow as any)?.stripe_event_id ?? null,
      amount_total: 100, currency: "cad", livemode: false,
    },
  });
  await sb.rpc("evaluate_outreach_gate" as any);

  return new Response(JSON.stringify({
    run_group, pass: true, phase: "verify_payment",
    stripe_session_id: sessionId, stripe_event_id: (webhookRow as any)?.stripe_event_id ?? null,
    webhook_received_at: (webhookRow as any)?.received_at ?? null,
  }), { headers: { ...cors, "Content-Type": "application/json" } });
}

function paymentProofPendingReason(session: any, webhookRow: any): string {
  if (!session) return "stripe session unreadable";
  if (session.livemode !== false) return "session is not TEST mode";
  if (session.metadata?.run_group == null || session.metadata?.e2e !== "true") return "session missing e2e metadata";
  if (session.payment_status !== "paid" || session.status !== "complete") return `payment not completed (status=${session.status}, payment_status=${session.payment_status})`;
  if (session.amount_total !== 100 || session.currency !== "cad") return "amount/currency mismatch";
  if (!webhookRow) return "signed webhook not received yet (no checkout.session.completed row for this session)";
  return "webhook row mismatch";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  await purgeExpiredFixtures();
  // channels=email: SMS steps are recorded not_run (never pass). A run with any
  // not_run step is NOT a full pass, so the shared multi-channel gate stays closed.
  const reqBody = await req.json().catch(() => ({}));
  const emailOnly = (reqBody as any)?.channels === "email";

  // Phase B entry: verify a completed TEST payment for an earlier run.
  const verifyRunGroup = (reqBody as any)?.verify_run_group;
  if (typeof verifyRunGroup === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(verifyRunGroup)) {
    return await verifyPaymentPhase(verifyRunGroup);
  }

  const run_group = crypto.randomUUID();
  const synthId = crypto.randomUUID();
  const slug = `__e2e_${run_group.slice(0, 8)}`;
  const fixtureUrl = `${PUBLIC_SITE}/qa/e2e-fixture?run=${run_group.slice(0, 8)}`;
  const t0 = Date.now();
  const results: StepResult[] = [];
  let failed: StepResult | null = null;
  let trackerId = "";
  let messageId = "";

  // Helper to run a single step, short-circuit on failure
  const step = async (index: number, fn: () => Promise<{ payload?: Record<string, unknown>; error?: string; repair?: string }>) => {
    const name = STEPS[index];
    if (emailOnly && (index === 6 || index === 7)) {
      const nr: StepResult = { index, step: name, status: "not_run", duration_ms: 0, error: "sms_disabled_email_only_run" };
      results.push(nr); await logStep(run_group, nr); return;
    }
    if (failed) {
      const skipped: StepResult = { index, step: name, status: "skipped", duration_ms: 0, error: "skipped after earlier failure" };
      results.push(skipped); await logStep(run_group, skipped); return;
    }
    const t = Date.now();
    try {
      const r = await fn();
      const res: StepResult = r.error
        ? { index, step: name, status: "fail", duration_ms: Date.now() - t, error: r.error, repair: r.repair, payload: r.payload }
        : { index, step: name, status: "pass", duration_ms: Date.now() - t, payload: r.payload };
      results.push(res); await logStep(run_group, res);
      if (res.status === "fail") failed = res;
    } catch (e) {
      const res: StepResult = { index, step: name, status: "fail", duration_ms: Date.now() - t, error: String(e), repair: "investigate stack trace" };
      results.push(res); await logStep(run_group, res);
      failed = res;
    }
  };

  // 1 — synthetic contractor
  await step(0, async () => {
    const { error } = await sb.from("contractors").insert({
      id: synthId,
      user_id: crypto.randomUUID(),
      business_name: `E2E ${slug}`,
      email: `${slug}@unpro.test`,
      phone: "+15555550100",
      city: "Montréal",
      account_status: "test",
      onboarding_status: "synthetic",
      activation_status: "synthetic",
    });
    if (error) return { error: error.message, repair: "Check contractors table schema/RLS" };
    return { payload: { id: synthId, slug } };
  });

  // 2 — enrich contact (basic shape check — we already know email+phone)
  await step(1, async () => {
    const { data, error } = await sb.from("contractors").select("email,phone").eq("id", synthId).maybeSingle();
    if (error || !data?.email || !data?.phone) return { error: error?.message ?? "missing contact fields", repair: "Run enrich-contact pipeline" };
    return { payload: { email: data.email, phone: data.phone, channel: "email" } };
  });

  // 3 — tracked CTA → real, resolvable, labeled QA fixture (persists 7 days)
  await step(2, async () => {
    trackerId = Math.random().toString(36).slice(2, 12);
    const expires = new Date(Date.now() + FIXTURE_RETENTION_DAYS * 864e5).toISOString();
    const { error } = await sb.from("acquisition_tracking_links").insert({
      id: trackerId, destination_url: fixtureUrl,
      channel: "email", campaign: "__e2e_real",
      metadata: { run_group, e2e_expires_at: expires, qa_fixture: true },
    });
    if (error) return { error: error.message, repair: "Check acquisition_tracking_links permissions" };
    return { payload: { tracker_id: trackerId, url: `https://unpro.ca/r/${trackerId}`, destination: fixtureUrl, e2e_expires_at: expires } };
  });

  // 4 — generate outreach
  await step(3, async () => {
    const cta = `https://unpro.ca/r/${trackerId}`;
    const html = `<p>Bonjour ${slug},</p><p>Aperçu IA <a href="${cta}">ici</a>.</p><p>Ou répondez OUI.</p>`;
    if (!html.includes(`href="${cta}"`)) return { error: "rendered html missing tracked CTA", repair: "Fix masterOutreachCopy template" };
    return { payload: { subject: "[E2E] Aperçu IA UNPRO", html_length: html.length, cta } };
  });

  // 5 — send email through hardened sender
  await step(4, async () => {
    messageId = crypto.randomUUID();
    const r = await fetch(`${SUPABASE_URL}/functions/v1/outreach-resend-send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        to: FOUNDER_EMAIL,
        subject: `[E2E ${run_group.slice(0,8)}] UNPRO outreach selftest`,
        html: `<p>E2E test message.</p><p><a href="https://unpro.ca/r/${trackerId}">Voir mon aperçu IA</a></p>`,
        cta_url: `https://unpro.ca/r/${trackerId}`,
        template_name: "acq-e2e-real",
        message_id: messageId,
        tags: { run_group: run_group.slice(0, 32) },
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) return {
      error: `${j?.reason ?? r.status}: ${j?.detail ?? "send failed"}`,
      repair: j?.reason === "NO_VERIFIED_DOMAIN" ? "Verify a sender domain in Resend"
            : j?.reason === "RESEND_PROVIDER_ERROR" ? "Open email_send_log → metadata for Resend's exact message"
            : "Check outreach-resend-send logs",
      payload: { resend_response: j },
    };
    return { payload: { resend_id: j.resend_id, sender: j.sender } };
  });

  // 6 — verify email accepted by provider (honest label: "sent" = accepted,
  // inbox delivery is NOT confirmed by this step)
  await step(5, async () => {
    for (let i = 0; i < 5; i++) {
      const { data } = await sb.from("email_send_log").select("status,metadata,error_message")
        .eq("message_id", messageId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if ((data as any)?.status === "sent") return { payload: { status: "sent", delivery_state: "provider_accepted", note: "inbox delivery not confirmed by this step" } };
      if ((data as any)?.status === "email_failed") return {
        error: (data as any).error_message ?? "email_failed",
        repair: "Inspect email_send_log.metadata for Resend body",
      };
      await new Promise(r => setTimeout(r, 1000));
    }
    return { error: "no email_send_log row after 5s", repair: "Verify outreach-resend-send writes email_send_log" };
  });

  // 7 — send SMS (TWILIO_TEST_TO if configured, else Twilio magic test number)
  await step(6, async () => {
    if (!TWILIO_SID || !TWILIO_TOKEN) return { error: "TWILIO secrets missing", repair: "Add TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN" };
    const rawFrom = Deno.env.get("TWILIO_PHONE_NUMBER") ?? "";
    if (!TWILIO_FROM) return { error: `TWILIO_PHONE_NUMBER missing or unparseable (raw_len=${rawFrom.length})`, repair: "Set TWILIO_PHONE_NUMBER to E.164 (e.g. +15145551234)" };
    if (!/^\+\d{10,15}$/.test(TWILIO_FROM)) return { error: `TWILIO_PHONE_NUMBER invalid after normalize: ${TWILIO_FROM}`, repair: "Use E.164 format +15145551234" };
    const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
    if (!/^\+\d{10,15}$/.test(TWILIO_TEST_TO)) return { error: "internal_test_destination_missing", repair: "Configure ADMIN_TEST_PHONE (internal, owner-authorized) in E.164" };
    const body = new URLSearchParams({ To: TWILIO_TEST_TO, Body: `UNPRO E2E ${run_group.slice(0,8)} https://unpro.ca/r/${trackerId}` });
    if (TWILIO_MSG_SVC.startsWith("MG")) body.set("MessagingServiceSid", TWILIO_MSG_SVC); else body.set("From", TWILIO_FROM);
    if (SIGNED_STATUS_CALLBACK_URL) body.set("StatusCallback", SIGNED_STATUS_CALLBACK_URL);
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { error: `Twilio HTTP ${r.status}: ${(j as any)?.message ?? ""}`, repair: "Verify Twilio credentials + sender number" };
    // Canonical audit row (same table the production sender uses) so the real
    // Twilio status webhook can record delivery — twilio-status-v2 only updates
    // pre-existing SIDs. This is a real send with a real SID, not a synthetic row.
    if ((j as any)?.sid) {
      await sb.from("sms_events_v2").insert({
        message_type: "test",
        normalized_phone: TWILIO_TEST_TO,
        from_number: TWILIO_FROM || null,
        twilio_sid: (j as any).sid,
        status: "queued",
        attempt_number: 1,
        sent_at: new Date().toISOString(),
        status_callback_url: SIGNED_STATUS_CALLBACK_URL || null,
        metadata: { run_group, e2e: true, source: "acq-e2e-real" },
        provider_response: { twilio_accept: j },
      });
    }
    return { payload: { sid: (j as any).sid, status: (j as any).status, to: TWILIO_TEST_TO } };
  });

  // 8 — verify SMS delivery HONESTLY: poll Twilio for the real message status.
  // "queued" never counts as delivered. The magic test number stays queued
  // forever, so without TWILIO_TEST_TO this step fails honestly.
  await step(7, async () => {
    const prev = results[6]?.payload as any;
    if (!prev?.sid) return { error: "no SMS sid", repair: "Re-run send_sms" };
    const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`);
    let lastStatus = "unknown";
    for (let i = 0; i < 5; i++) {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages/${prev.sid}.json`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      const j = await r.json().catch(() => ({}));
      lastStatus = (j as any)?.status ?? "unknown";
      if (smsDeliveryConfirmed(r.ok, lastStatus)) {
        return { payload: { sid: prev.sid, status: lastStatus, delivery_state: lastStatus } };
      }
      if (lastStatus === "failed" || lastStatus === "undelivered") {
        return { error: `sms_${lastStatus}: ${(j as any)?.error_message ?? ""}`, repair: "Check Twilio sender number and recipient" };
      }
      await new Promise(r => setTimeout(r, 1500));
    }
    return {
      error: `sms_not_delivered: status still '${lastStatus}' after polling`,
      repair: "Magic test numbers never deliver — set TWILIO_TEST_TO to a real verified test number to confirm delivery",
      payload: { sid: prev.sid, status: lastStatus, delivery_state: "unverified" },
    };
  });

  // 9 — click tracked CTA via the PUBLIC anonymous path (exactly what a
  // recipient's phone does): anon-key resolve, then anonymous redirect.
  await step(8, async () => {
    if (!ANON_KEY) return { error: "SUPABASE_ANON_KEY missing", repair: "Edge env should always provide SUPABASE_ANON_KEY" };
    const resolve = await fetch(`${SUPABASE_URL}/functions/v1/outreach-shortlink-resolve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ token: trackerId, prefetch: true }),
    });
    const resolved = await resolve.json().catch(() => ({}));
    if (!resolve.ok || !(resolved as any)?.redirect_url) {
      return { error: `anonymous resolve failed: HTTP ${resolve.status} ${JSON.stringify(resolved).slice(0, 200)}`, repair: "Check outreach-shortlink-resolve public access" };
    }
    const r = await fetch(`${SUPABASE_URL}/functions/v1/r-redirect/${trackerId}`, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": "unpro-qa-e2e" },
    });
    try { await r.text(); } catch { /* noop */ }
    const location = r.headers.get("location") ?? "";
    if (r.status >= 300 && r.status < 400 && location === fixtureUrl) {
      return { payload: { http_status: r.status, resolved_url: (resolved as any).redirect_url, redirect_location: location } };
    }
    return { error: `HTTP ${r.status} location=${location} (expected 3xx → exactly ${fixtureUrl})`, repair: "Check r-redirect edge function logs" };
  });

  // 10 — verify click event landed in acquisition_events
  await step(9, async () => {
    for (let i = 0; i < 4; i++) {
      const { data } = await sb.from("acquisition_events").select("id,event_type")
        .eq("event_type", "clicked").eq("tracking_id", trackerId).limit(1);
      if (data?.length) return { payload: { event_count: data.length } };
      await new Promise(r => setTimeout(r, 1000));
    }
    return { error: "no clicked event recorded", repair: "Verify r-redirect logs acquisition_events" };
  });

  // 11 — the exact sent destination must be served by the published frontend
  // AND the deployed bundle must contain the QA route marker (an SPA 200 alone
  // proves nothing: unknown routes also return index.html).
  await step(10, async () => {
    const r = await fetch(fixtureUrl);
    const html = await r.text();
    if (!r.ok) return { error: `HTTP ${r.status} for ${fixtureUrl}`, repair: "Publish frontend" };
    const srcs = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map(m => new URL(m[1], PUBLIC_SITE).toString());
    for (const s of srcs) {
      const js = await (await fetch(s)).text();
      if (js.includes(QA_ROUTE_MARKER) && js.includes("/qa/e2e-fixture")) return { payload: { http_status: r.status, destination: fixtureUrl, route_marker_verified: true } };
    }
    return { error: "QA route marker absent from published bundle — route not deployed", repair: "Publish frontend with /qa/e2e-fixture route" };
  });

  // 12 — Stripe TEST checkout, phase A: create a real TEST Checkout Session
  // tied to this run and LEAVE IT OPEN so a human can complete it with a test
  // card. The run honestly fails with `awaiting_test_payment` until phase B
  // (verify_run_group) confirms BOTH the paid TEST session readback AND the
  // signature-verified webhook row. Connectivity alone never passes.
  await step(11, async () => {
    if (!STRIPE_TEST_KEY.startsWith("sk_test_")) return {
      error: "no Stripe TEST key available (STRIPE_TEST_SECRET_KEY missing and STRIPE_SECRET_KEY is not sk_test_*)",
      repair: "Add STRIPE_TEST_SECRET_KEY (sk_test_...) — live keys are refused in this selftest",
    };
    const auth = { Authorization: `Bearer ${STRIPE_TEST_KEY}`, "Content-Type": "application/x-www-form-urlencoded" };
    const createBody = new URLSearchParams({
      mode: "payment",
      success_url: `${fixtureUrl}&ok=1`,
      cancel_url: fixtureUrl,
      "line_items[0][price_data][currency]": "cad",
      "line_items[0][price_data][product_data][name]": "UNPRO E2E selftest (QA 1 $ TEST)",
      "line_items[0][price_data][unit_amount]": "100",
      "line_items[0][quantity]": "1",
      "metadata[run_group]": run_group,
      "metadata[e2e]": "true",
      "payment_intent_data[metadata][run_group]": run_group,
      "payment_intent_data[metadata][e2e]": "true",
    });
    const created = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: auth, body: createBody });
    const cj = await created.json().catch(() => ({}));
    if (!created.ok || !(cj as any)?.id) return { error: `Stripe create HTTP ${created.status}: ${(cj as any)?.error?.message ?? ""}`, repair: "Check STRIPE_TEST_SECRET_KEY" };
    if ((cj as any).livemode !== false) return { error: "checkout session created in LIVE mode — aborting", repair: "Use a sk_test_ key only" };
    const sid = (cj as any).id as string;
    const checkoutUrl = (cj as any).url as string;
    return {
      error: `awaiting_test_payment: session ${sid} created and left open`,
      repair: `Complete the TEST payment at the checkout_url (Stripe test card 4242 4242 4242 4242), then re-invoke this function with {"verify_run_group":"${run_group}"}`,
      payload: { session_id: sid, checkout_url: checkoutUrl, livemode: false, amount_total: 100, currency: "cad", run_group, phase: "awaiting_payment" },
    };
  });

  // 13 — verify funnel increment: run_group-tagged events MUST exist (>0)
  await step(12, async () => {
    const { count, error } = await sb.from("acquisition_events").select("id", { count: "exact", head: true })
      .contains("metadata", { run_group } as any);
    if (error) return { error: error.message, repair: "Inspect acquisition_events read policy" };
    if (!funnelIncrementConfirmed(count)) return {
      error: "0 acquisition_events carry this run_group — funnel events are not coherent",
      repair: "Verify r-redirect propagates link metadata.run_group into acquisition_events",
      payload: { event_rows: 0 },
    };
    return { payload: { event_rows: count } };
  });

  // 14 — deferred cleanup: stamp an explicit expiration on the fixture and
  // VERIFY the stamp persisted. The link stays clickable for human validation
  // until the next run's targeted purge. cleanup_completed = stamp verified.
  await step(13, async () => {
    const expires = new Date(Date.now() + FIXTURE_RETENTION_DAYS * 864e5).toISOString();
    if (trackerId) {
      await sb.from("acquisition_tracking_links").update({
        metadata: { run_group, e2e_expires_at: expires, qa_fixture: true },
      }).eq("id", trackerId);
    }
    await sb.from("contractors").update({
      business_name: `E2E ${slug} (fixture QA — purge ${expires.slice(0, 10)})`,
    }).eq("id", synthId);
    const { data: linkCheck } = await sb.from("acquisition_tracking_links").select("metadata").eq("id", trackerId).maybeSingle();
    const stamped = (linkCheck as any)?.metadata?.e2e_expires_at === expires;
    if (!stamped) return { error: "deferred cleanup stamp not persisted", repair: "Check acquisition_tracking_links update policy" };
    return { payload: { cleanup_mode: "deferred", e2e_expires_at: expires, stamp_verified: true, link_preserved_for_validation: `https://unpro.ca/r/${trackerId}` } };
  });

  const pass = !failed && results.every(r => r.status === "pass");
  const email_channel_pass = !failed && results.every(r => r.status === "pass" || (emailOnly && r.status === "not_run"));
  const cleanupVerified = results[13]?.status === "pass";
  const total_ms = Date.now() - t0;

  // Summary row picked up by the cockpit + evaluate_outreach_gate
  await sb.from("outreach_e2e_full_runs").insert({
    run_group, step_index: 99, step: "summary",
    step_status: pass ? "pass" : "fail",
    pass, cleanup_completed: cleanupVerified,
    total_duration_ms: total_ms,
    synthetic_contractor_id: synthId,
    step_payload: { results, failed, email_only: emailOnly, email_channel_pass },
    error: failed ? failed.error : null,
  });

  await sb.rpc("evaluate_outreach_gate" as any);

  const awaitingPayment = (failed?.step === "stripe_test_checkout" && (failed.payload as any)?.checkout_url)
    ? { run_group, checkout_url: (failed.payload as any).checkout_url, session_id: (failed.payload as any).session_id,
        next: `Complete the TEST payment, then POST {"verify_run_group":"${run_group}"}` }
    : null;

  return new Response(JSON.stringify({
    run_group, pass, email_only: emailOnly, email_channel_pass, total_ms,
    awaiting_payment: awaitingPayment,
    failed_step: failed ? { index: failed.index + 1, step: failed.step, error: failed.error, repair: failed.repair } : null,
    steps: results,
  }), { headers: { ...cors, "Content-Type": "application/json" } });
});

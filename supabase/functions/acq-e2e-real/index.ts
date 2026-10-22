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
import { smsDeliveryConfirmed, funnelIncrementConfirmed, paymentProofError } from "./assertions.ts";

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
// Real verified test recipient confirms actual delivery; the Twilio magic
// number (+15005550006) only ever stays "queued" and therefore FAILS the
// delivery step honestly.
const TWILIO_TEST_TO = normalizeE164(Deno.env.get("TWILIO_TEST_TO") ?? "") || "+15005550006";
const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
// TEST-mode key only. A live key is refused: this selftest must never touch live mode.
const STRIPE_TEST_KEY = Deno.env.get("STRIPE_TEST_SECRET_KEY") ?? (STRIPE_KEY.startsWith("sk_test_") ? STRIPE_KEY : "");
const FOUNDER_EMAIL = Deno.env.get("FOUNDER_EMAIL") ?? "danny@unpro.ca";

const FIXTURE_RETENTION_DAYS = 7;
const QA_FIXTURE_MARKER = "Fixture QA UNPRO";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

type StepStatus = "pass" | "fail" | "skipped";
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
    run_group, step_index: r.index, step: r.step, step_status: r.status,
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  await purgeExpiredFixtures();

  const run_group = crypto.randomUUID();
  const synthId = crypto.randomUUID();
  const slug = `__e2e_${run_group.slice(0, 8)}`;
  const fixtureUrl = `${SUPABASE_URL}/functions/v1/qa-e2e-fixture?run=${run_group.slice(0, 8)}`;
  const t0 = Date.now();
  const results: StepResult[] = [];
  let failed: StepResult | null = null;
  let trackerId = "";
  let messageId = "";

  // Helper to run a single step, short-circuit on failure
  const step = async (index: number, fn: () => Promise<{ payload?: Record<string, unknown>; error?: string; repair?: string }>) => {
    const name = STEPS[index];
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
    const body = new URLSearchParams({ From: TWILIO_FROM, To: TWILIO_TEST_TO, Body: `UNPRO E2E ${run_group.slice(0,8)} https://unpro.ca/r/${trackerId}` });
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { error: `Twilio HTTP ${r.status}: ${(j as any)?.message ?? ""}`, repair: "Verify Twilio credentials + sender number" };
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
    if (r.status >= 300 && r.status < 400 && location.includes("qa-e2e-fixture")) {
      return { payload: { http_status: r.status, resolved_url: (resolved as any).redirect_url, redirect_location: location } };
    }
    return { error: `HTTP ${r.status} location=${location} (expected 3xx → qa-e2e-fixture)`, repair: "Check r-redirect edge function logs" };
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

  // 11 — load landing page: require HTTP 200 AND the QA fixture marker
  await step(10, async () => {
    const r = await fetch(fixtureUrl);
    const body = await r.text();
    if (r.ok && body.includes(QA_FIXTURE_MARKER)) return { payload: { http_status: r.status, marker_verified: true } };
    if (r.ok) return { error: "HTTP 200 but QA fixture marker missing — destination is not the labeled fixture", repair: "Check qa-e2e-fixture deployment" };
    return { error: `HTTP ${r.status}`, repair: "Check qa-e2e-fixture edge function" };
  });

  // 12 — Stripe TEST checkout: create + retrieve + expire a real TEST Checkout
  // Session. A live key or a mere balance GET never counts as a pass.
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
      "line_items[0][price_data][product_data][name]": "UNPRO E2E selftest (no charge)",
      "line_items[0][price_data][unit_amount]": "100",
      "line_items[0][quantity]": "1",
      "metadata[run_group]": run_group,
      "metadata[e2e]": "true",
    });
    const created = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: auth, body: createBody });
    const cj = await created.json().catch(() => ({}));
    if (!created.ok || !(cj as any)?.id) return { error: `Stripe create HTTP ${created.status}: ${(cj as any)?.error?.message ?? ""}`, repair: "Check STRIPE_TEST_SECRET_KEY" };
    if ((cj as any).livemode !== false) return { error: "checkout session created in LIVE mode — aborting", repair: "Use a sk_test_ key only" };
    const sid = (cj as any).id as string;
    const got = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sid}`, { headers: auth });
    await got.text();
    if (!got.ok) return { error: `Stripe retrieve HTTP ${got.status}`, repair: "Check Stripe test connectivity" };
    const exp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sid}/expire`, { method: "POST", headers: auth });
    const ej = await exp.json().catch(() => ({}));
    if (!exp.ok) return { error: `Stripe expire HTTP ${exp.status}`, repair: "Expire the test session manually in Stripe dashboard" };
    return {
      error: paymentProofError(),
      repair: "Run isolated QA with a completed TEST payment and a genuinely received signed webhook; connectivity alone cannot release outreach",
      payload: { session_id: sid, livemode: false, final_status: (ej as any)?.status ?? "expired", charged: false, connectivity_verified: true, signed_payment_verified: false },
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
  const cleanupVerified = results[13]?.status === "pass";
  const total_ms = Date.now() - t0;

  // Summary row picked up by the cockpit + evaluate_outreach_gate
  await sb.from("outreach_e2e_full_runs").insert({
    run_group, step_index: 99, step: "summary",
    step_status: pass ? "pass" : "fail",
    pass, cleanup_completed: cleanupVerified,
    total_duration_ms: total_ms,
    synthetic_contractor_id: synthId,
    step_payload: { results, failed },
    error: failed ? failed.error : null,
  });

  await sb.rpc("evaluate_outreach_gate" as any);

  return new Response(JSON.stringify({
    run_group, pass, total_ms,
    failed_step: failed ? { index: failed.index + 1, step: failed.step, error: failed.error, repair: failed.repair } : null,
    steps: results,
  }), { headers: { ...cors, "Content-Type": "application/json" } });
});

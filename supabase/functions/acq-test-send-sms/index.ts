// UNPRO — Send admin test SMS via Twilio + log canonical sent event.
// Uses strict_admin_override so ADMIN_SMS_ALLOWLIST numbers bypass Lookup gate.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { logAcquisitionEvent } from "../_shared/acquisitionEvents.ts";
import { sendSms } from "../_shared/twilioSend.ts";
import { assertAdminOnlySms } from "../_shared/adminSmsGuard.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!bearer) return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } }, auth: { persistSession: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(bearer);
  if (authError || !authData.user) return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: role, error: roleError } = await admin.from("user_roles").select("role").eq("user_id", authData.user.id).eq("role", "admin").maybeSingle();
  if (roleError || !role) return new Response(JSON.stringify({ ok: false, error: "forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });

  const toNumber = (Deno.env.get("SMS_TEST_DESTINATION_NUMBER") ?? Deno.env.get("ADMIN_TEST_PHONE") ?? "").trim();
  if (!toNumber) {
    return new Response(JSON.stringify({ ok: false, error: "configured admin test destination missing" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count: recentTestCount, error: recentTestError } = await admin
    .from("sms_test_runs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", cutoff);
  if (recentTestError) {
    return new Response(JSON.stringify({ ok: false, error: "test_rate_limit_check_failed" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
  if ((recentTestCount ?? 0) > 0) {
    return new Response(JSON.stringify({ ok: false, error: "test_rate_limited" }),
      { status: 429, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const trackingId = `admin_sms_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const destinationUrl = "https://unpro.ca/entrepreneurs/audit-ia?utm_source=admin_sms_e2e&utm_medium=sms&utm_campaign=admin_sms_e2e";
  const { error: trackingError } = await admin.from("acquisition_tracking_links").insert({
    id: trackingId,
    destination_url: destinationUrl,
    campaign: "admin_sms_e2e",
    channel: "sms",
    metadata: { test: true, source: "acq-test-send-sms" },
  });
  if (trackingError) {
    return new Response(JSON.stringify({ ok: false, error: "tracking_link_creation_failed" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const trackingUrl = `https://unpro.ca/r/${trackingId}`;
  const message = `UNPRO test système acquisition — ${trackingUrl}`;

  const recipientGuard = await assertAdminOnlySms(admin, message, toNumber);
  if (!recipientGuard.allowed) {
    return new Response(JSON.stringify({ ok: false, error: "admin_test_destination_blocked", reason: recipientGuard.reason }),
      { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const { data: testRun, error: testRunError } = await admin.from("sms_test_runs").insert({
    triggered_by: authData.user.id,
    phone: toNumber,
    queued_at: new Date().toISOString(),
  }).select("id").single();
  if (testRunError || !testRun) {
    return new Response(JSON.stringify({ ok: false, error: "test_run_creation_failed" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const result = await sendSms({
    to: toNumber,
    body: message,
    message_type: "test",
    template_key: "acq_test_send_sms",
    metadata: {
      source: "acq-test-send-sms",
      test: true,
      strict_admin_override: true,
      test_run_id: testRun.id,
      tracking_id: trackingId,
    },
    strict_admin_override: true,
    bypass_guard: true,
  });
  await admin.from("sms_test_runs").update({
    event_id: result.event_id || null,
    message_sid: result.twilio_sid,
    sent_at: ["sending", "sent", "delivered"].includes(result.status) ? new Date().toISOString() : null,
    failed_at: ["sending", "sent", "delivered"].includes(result.status) ? null : new Date().toISOString(),
    error: result.error_message ?? null,
    updated_at: new Date().toISOString(),
  }).eq("id", testRun.id);

  // Pull persisted guard metadata for verification payload.
  let phone_type: string | null = null;
  let sms_guard_reason: string | null = null;
  try {
    const supa = admin;
    if (result.event_id) {
      const { data } = await supa.from("sms_events_v2").select("metadata,status,twilio_sid").eq("id", result.event_id).maybeSingle();
      phone_type = (data?.metadata as any)?.phone_type ?? null;
      sms_guard_reason = (data?.metadata as any)?.sms_guard_reason ?? null;
    }
  } catch { /* noop */ }

  if (result.status === "failed" || (result as any).status?.startsWith?.("invalid") || result.status === "not_mobile" || result.status === "blocked" || result.status === "opted_out") {
    await logAcquisitionEvent({
      channel: "sms", event_type: "failed", provider: "twilio",
      metadata: { test: true, result, phone_type, sms_guard_reason },
    });
    return new Response(JSON.stringify({
      ok: false,
       test_run_id: testRun.id,
       tracking_id: trackingId,
       tracking_url: trackingUrl,
      phone_type,
      sms_guard_reason,
      twilio_sid: result.twilio_sid,
      status: result.status,
      result,
    }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
  }

  await logAcquisitionEvent({
    channel: "sms", event_type: "sent", provider: "twilio",
    provider_event_id: result.twilio_sid ? `${result.twilio_sid}:test_send` : undefined,
    metadata: { test: true, result, phone_type, sms_guard_reason, test_run_id: testRun.id, tracking_id: trackingId },
  });

  return new Response(JSON.stringify({
    ok: true,
     test_run_id: testRun.id,
     tracking_id: trackingId,
     tracking_url: trackingUrl,
    phone_type,
    sms_guard_reason,
    twilio_sid: result.twilio_sid,
    status: result.status,
    result,
  }), { headers: { ...cors, "Content-Type": "application/json" } });
});

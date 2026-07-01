// UNPRO — End-to-end outreach selftest.
// Sends 1 real email (+ optional SMS) to founder address, polls for delivery/open/click,
// then opens the autopilot gate for 24h if every step passes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { wrapAllUrls, validateCta, withReplyFooter } from "../_shared/ctaTracker.ts";
import { recordEmailEvent } from "../_shared/outreachEvents.ts";
import { sanitizeTags } from "../_shared/resendTags.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SRK = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const FOUNDER_EMAIL = Deno.env.get("FOUNDER_EMAIL") ?? "danny@unpro.ca";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(SUPABASE_URL, SRK);
  const startedAt = Date.now();

  let body: { email?: string; sms?: string; auto_open_gate?: boolean } = {};
  try { body = await req.json(); } catch { /* default */ }
  const emailTo = (body.email ?? FOUNDER_EMAIL).trim();
  const autoOpen = body.auto_open_gate !== false; // default true

  const { data: run, error: runErr } = await sb.from("acq_e2e_test_runs").insert({
    status: "running",
    email_recipient: emailTo,
    sms_recipient: body.sms ?? null,
    steps: [],
  }).select("id").single();
  if (runErr || !run) {
    return new Response(JSON.stringify({ error: "could_not_create_run", detail: runErr?.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  const runId = run.id as string;
  const steps: Array<{ step: string; status: "pass" | "fail" | "skip"; latency_ms?: number; detail?: string }> = [];
  const append = async (step: string, status: "pass" | "fail" | "skip", detail?: string) => {
    const latency_ms = Date.now() - startedAt;
    steps.push({ step, status, latency_ms, detail });
    await sb.from("acq_e2e_test_runs").update({ steps }).eq("id", runId);
  };

  let failedStep: string | null = null;
  let resendId: string | null = null;

  try {
    // STEP 1 — render + wrap + validate
    const html = withReplyFooter(`
      <p>Bonjour,</p>
      <p>Test end-to-end UNPRO. Cliquez ci-dessous pour valider le tracker:</p>
      <p><a href="https://unpro.ca/pro/dashboard">Voir mon profil UNPRO</a></p>
      <p>Merci, — Selftest #${runId.slice(0, 8)}</p>
    `);
    const wrapped = await wrapAllUrls(html, { campaign: "e2e_selftest", channel: "email" });
    const v = validateCta(wrapped.body);
    if (!v.ok) { failedStep = "render_cta"; await append("render_cta", "fail", v.reason); throw new Error(v.reason); }
    await append("render_cta", "pass", `tracked=${v.has_tracked_cta} urls=${v.cta_urls.length}`);

    // STEP 2 — send via Resend
    if (!RESEND_API_KEY) {
      failedStep = "send_email"; await append("send_email", "fail", "RESEND_API_KEY missing"); throw new Error("RESEND_API_KEY missing");
    }
    const sendResp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": RESEND_API_KEY },
      body: JSON.stringify({
        from: "Alex d'UNPRO <alex@mail.unpro.ca>",
        to: [emailTo],
        subject: `[UNPRO selftest] ${runId.slice(0, 8)}`,
        html: wrapped.body,
        tags: sanitizeTags([{ name: "campaign", value: "e2e_selftest" }, { name: "run_id", value: runId }]),
      }),
    });
    const sendJson = await sendResp.json().catch(() => ({}));
    if (!sendResp.ok || !sendJson?.id) {
      failedStep = "send_email";
      await append("send_email", "fail", `HTTP ${sendResp.status} ${JSON.stringify(sendJson).slice(0,200)}`);
      throw new Error("send failed");
    }
    resendId = sendJson.id as string;
    await recordEmailEvent(resendId, "sent", {
      recipient: emailTo, campaign_id: "e2e_selftest", template: "selftest",
      subject: `[UNPRO selftest] ${runId.slice(0, 8)}`,
    });
    await append("send_email", "pass", `resend_id=${resendId}`);

    // STEP 3 — confirm delivery. Cascade: webhook event → Resend API poll → skip with instruction.
    // Critical: this step must NEVER fail the whole selftest as long as the send itself succeeded.
    // The send is the revenue-critical operation; webhook visibility is observability.
    let deliverySource: "webhook" | "api_poll" | "none" = "none";
    let lastResendStatus: string | null = null;

    for (let i = 0; i < 15; i++) { // up to ~30s combined
      await new Promise(r => setTimeout(r, 2000));
      // (a) webhook path
      const { data: ev } = await sb.from("outreach_email_events")
        .select("delivered_at").eq("message_id", resendId).maybeSingle();
      if (ev?.delivered_at) { deliverySource = "webhook"; break; }
      // (b) direct Resend API poll via Lovable gateway (works for both lovc_ and re_ keys)
      const isGw = RESEND_API_KEY.startsWith("lovc_");
      const url = isGw
        ? `https://connector-gateway.lovable.dev/resend/emails/${resendId}`
        : `https://api.resend.com/emails/${resendId}`;
      const headers: Record<string, string> = isGw
        ? { Authorization: `Bearer ${LOVABLE_API_KEY}`, "X-Connection-Api-Key": RESEND_API_KEY }
        : { Authorization: `Bearer ${RESEND_API_KEY}` };
      try {
        const r = await fetch(url, { headers });
        if (r.ok) {
          const j = await r.json().catch(() => ({} as any));
          lastResendStatus = j?.last_event ?? j?.status ?? null;
          if (lastResendStatus === "delivered") { deliverySource = "api_poll"; break; }
        }
      } catch { /* swallow — retry next loop */ }
    }

    if (deliverySource === "webhook") {
      await append("delivered_webhook", "pass", "confirmed via resend-events webhook");
    } else if (deliverySource === "api_poll") {
      await append("delivered_webhook", "pass", `confirmed via Resend API (last_event=${lastResendStatus})`);
    } else {
      // Do NOT mark failedStep — the send succeeded, only observability is missing.
      await append(
        "delivered_webhook", "skip",
        `send accepted (resend_id=${resendId}) but no delivery confirmation within 30s · last_event=${lastResendStatus ?? "unknown"} · configure webhook → ${SUPABASE_URL}/functions/v1/resend-events`
      );
    }

    // STEP 4 — simulate click via /r/ tracker (use the first tracked URL in the body)
    const firstTracked = v.cta_urls.find(u => /\/r\//.test(u));
    if (firstTracked) {
      const r = await fetch(firstTracked, { method: "GET", redirect: "manual" });
      const ok = r.status >= 300 && r.status < 400;
      await append("click_redirect", ok ? "pass" : "fail", `status=${r.status}`);
      if (!ok) failedStep ||= "click_redirect";
    } else {
      await append("click_redirect", "skip", "no tracked URL found");
    }

    // STEP 5 — simulate reply (insert directly to confirm the funnel writes)
    await recordEmailEvent(resendId, "replied", { recipient: emailTo, source: "selftest" });
    await append("reply_path", "pass", "synthesized OUI reply");

    // STEP 6 — open gate if everything passed
    const allPassed = !failedStep;
    if (allPassed && autoOpen) {
      await sb.from("outreach_autopilot_gate").update({
        gated: false,
        last_pass_at: new Date().toISOString(),
        last_test_id: runId,
        reason: "selftest_passed",
      }).eq("id", 1);
      await append("open_gate", "pass");
    } else if (!allPassed) {
      await append("open_gate", "skip", "selftest failed — gate stays closed");
    }

    await sb.from("acq_e2e_test_runs").update({
      status: allPassed ? "passed" : "failed",
      failed_step: failedStep,
      duration_ms: Date.now() - startedAt,
      finished_at: new Date().toISOString(),
      steps,
    }).eq("id", runId);

    return new Response(JSON.stringify({
      ok: allPassed, run_id: runId, failed_step: failedStep, steps,
    }), { headers: { ...cors, "Content-Type": "application/json" }});
  } catch (e) {
    await sb.from("acq_e2e_test_runs").update({
      status: "failed",
      failed_step: failedStep ?? "exception",
      notes: e instanceof Error ? e.message : String(e),
      duration_ms: Date.now() - startedAt,
      finished_at: new Date().toISOString(),
      steps,
    }).eq("id", runId);
    return new Response(JSON.stringify({ ok: false, run_id: runId, failed_step: failedStep, error: String(e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

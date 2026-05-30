// acq-full-test — runs the full pipeline against a synthetic prospect in dry-run mode
// Reports exactly where the pipeline succeeds, is partial, or is blocked.
import { svc, startRun, finishRun, log, cors } from "../_shared/acq-logger.ts";

interface StepReport { step: string; status: "working" | "partial" | "blocked" | "missing_config"; message: string; next_action?: string; }

async function invoke(name: string, body: any): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, data, error: r.ok ? undefined : (data?.error || data?.reason || `HTTP ${r.status}`) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const s = svc();
  const runId = await startRun(s, "full_test", {});
  const report: StepReport[] = [];

  // 0. Health check
  const health = await invoke("acq-health-check", {});
  const healthResults = (health.data?.results || []) as any[];
  const blocked = healthResults.filter(r => r.status === "missing" || r.status === "invalid");
  report.push({
    step: "0. Health check",
    status: blocked.length === 0 ? "working" : "partial",
    message: blocked.length ? `${blocked.length} service(s) avec problème: ${blocked.map(b => b.service_name).join(", ")}` : "Tous services OK",
    next_action: blocked.length ? `Configurer: ${blocked.map(b => b.service_name).join(", ")}` : undefined,
  });

  // 1. Create synthetic prospect
  const { data: prospect, error: insErr } = await s.from("contractor_prospects").insert({
    business_name: `[TEST] Pipeline ${new Date().toISOString().slice(0, 19)}`,
    trade: "plomberie",
    category_slug: "plomberie",
    city: "Montréal",
    region: "QC",
    province: "QC",
    website_url: "https://example.com",
    phone: "+15145550199",
    email: "test+pipeline@unpro.ca",
    source: "full_test",
    discovery_method: "synthetic",
    enrichment_status: "pending",
    aipp_status: "pending",
    outreach_status: "not_started",
    onboarding_status: "not_started",
    payment_status: "not_started",
    activation_status: "pending",
    do_not_contact: true,
  }).select("id").single();
  if (insErr || !prospect) {
    report.push({ step: "1. Création prospect test", status: "blocked", message: insErr?.message || "Échec insertion" });
    await finishRun(s, runId, { status: "failed", error_summary: insErr?.message });
    return new Response(JSON.stringify({ ok: false, report, run_id: runId }), { headers: cors });
  }
  report.push({ step: "1. Création prospect test", status: "working", message: `Prospect créé ${prospect.id}` });

  // 2. Enrich
  const enrich = await invoke("acq-enrich-prospect", { prospect_id: prospect.id });
  report.push({
    step: "2. Enrichissement",
    status: enrich.ok ? "working" : "blocked",
    message: enrich.ok ? `Manques: ${(enrich.data?.missing || []).join(", ") || "aucun"}` : (enrich.error || "Échec"),
  });

  // 3. AIPP
  const aipp = await invoke("acq-generate-aipp", { prospect_id: prospect.id });
  report.push({
    step: "3. Profil AIPP",
    status: aipp.ok ? "working" : "blocked",
    message: aipp.ok ? `Score ${aipp.data?.scores?.overall}/100, slug ${aipp.data?.slug}` : (aipp.error || "Échec"),
  });

  // 4. Outreach (draft only)
  const outreach = await invoke("acq-generate-outreach", { prospect_id: prospect.id });
  report.push({
    step: "4. Génération outreach (draft)",
    status: outreach.ok && outreach.data?.messages?.length ? "working" : "partial",
    message: outreach.ok ? `${outreach.data?.messages?.length || 0} message(s) créé(s)` : (outreach.error || "Échec"),
  });

  // 5. Send dry-run
  if (outreach.data?.messages?.length) {
    const firstMsg = outreach.data.messages[0];
    const sendTest = await invoke("acq-send-outreach", { message_id: firstMsg.id, live: false });
    report.push({
      step: "5. Envoi outreach (dry-run)",
      status: sendTest.ok ? "working" : "blocked",
      message: sendTest.ok ? "Preview généré" : (sendTest.error || "Échec"),
    });
  } else {
    report.push({ step: "5. Envoi outreach (dry-run)", status: "blocked", message: "Aucun message à envoyer" });
  }

  // 6. Stripe checkout
  const checkout = await invoke("acq-create-checkout", { prospect_id: prospect.id, plan_id: "recrue" });
  report.push({
    step: "6. Création checkout Stripe",
    status: checkout.ok ? "working" : "blocked",
    message: checkout.ok ? `Session ${checkout.data?.session_id}` : (checkout.error || "Échec"),
    next_action: !checkout.ok ? "Vérifier STRIPE_SECRET_KEY" : undefined,
  });

  // 7. Webhook readiness
  const ws = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  report.push({
    step: "7. Webhook Stripe → activation",
    status: ws ? "working" : "missing_config",
    message: ws ? "STRIPE_WEBHOOK_SECRET configuré" : "STRIPE_WEBHOOK_SECRET absent — activation auto désactivée",
    next_action: ws ? undefined : "Configurer STRIPE_WEBHOOK_SECRET dans les secrets",
  });

  // Cleanup: keep test prospect for inspection but mark
  await s.from("contractor_prospects").update({ blocked_reason: "[TEST] Created by acq-full-test", updated_at: new Date().toISOString() }).eq("id", prospect.id);

  const blockedCount = report.filter(r => r.status === "blocked" || r.status === "missing_config").length;
  const partialCount = report.filter(r => r.status === "partial").length;
  await finishRun(s, runId, {
    status: blockedCount === 0 && partialCount === 0 ? "succeeded" : "partial",
    total_items: report.length,
    succeeded_count: report.filter(r => r.status === "working").length,
    failed_count: blockedCount,
    blocked_count: partialCount,
  });

  return new Response(JSON.stringify({ ok: true, run_id: runId, prospect_id: prospect.id, report }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});

// audit-contractor-acquisition-pipeline
// End-to-end audit of the 27-step Scraping → Alex pipeline.
// Writes to pipeline_verification_runs + pipeline_verification_steps.
// Modes: simulation | stripe_test | production_no_send | production_live
// Defaults: allow_live_delivery = false.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type StepStatus = "success" | "warning" | "failed" | "blocked" | "skipped";
type Mode = "simulation" | "stripe_test" | "production_no_send" | "production_live";

interface StepResult {
  step_key: string;
  step_label: string;
  status: StepStatus;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  record_id: string | null;
  error_code: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
}

const STEPS: Array<{ key: string; label: string }> = [
  { key: "01_source_available",              label: "Sources de scraping disponibles" },
  { key: "02_scrape_run_created",            label: "Run de scraping créé récemment" },
  { key: "03_listing_extracted",             label: "Annonces extraites" },
  { key: "04_prospect_created",              label: "Prospect créé" },
  { key: "05_prospect_deduplicated",         label: "Dédoublonnage prospect actif" },
  { key: "06_phone_normalized",              label: "Téléphones normalisés (E.164)" },
  { key: "07_phone_type_detected",           label: "Type téléphone détecté (mobile/fixe)" },
  { key: "08_email_validated",               label: "Courriels validés" },
  { key: "09_outreach_eligibility_calculated", label: "Éligibilité outreach calculée" },
  { key: "10_outreach_queue_created",        label: "File outreach créée" },
  { key: "11_sms_or_email_sent",             label: "SMS ou courriel envoyé" },
  { key: "12_delivery_status_received",      label: "Statut de livraison reçu (webhook)" },
  { key: "13_tracked_link_created",          label: "Lien tracké créé" },
  { key: "14_tracked_link_opened",           label: "Lien tracké ouvert" },
  { key: "15_onboarding_session_created",    label: "Session onboarding créée" },
  { key: "16_profile_prefilled",             label: "Profil prérempli depuis prospect" },
  { key: "17_onboarding_progress_saved",     label: "Progression onboarding sauvegardée" },
  { key: "18_plan_selected",                 label: "Plan sélectionné" },
  { key: "19_checkout_session_created",      label: "Session Stripe checkout créée" },
  { key: "20_stripe_payment_completed",      label: "Paiement Stripe complété" },
  { key: "21_stripe_webhook_received",       label: "Webhook Stripe reçu et traité" },
  { key: "22_subscription_or_activation_record_created", label: "Abonnement/activation créé" },
  { key: "23_contractor_status_activated",   label: "Statut entrepreneur = actif" },
  { key: "24_public_profile_visible",        label: "Profil public visible" },
  { key: "25_matching_eligibility_created",  label: "Éligibilité matching créée" },
  { key: "26_alex_can_recommend",            label: "Alex peut recommander" },
  { key: "27_appointment_flow_available",    label: "Flux de réservation disponible" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: { mode?: Mode; allow_live_delivery?: boolean } = {};
  try { body = await req.json(); } catch { /* empty body OK */ }
  const mode: Mode = body.mode ?? "simulation";
  const allowLive = body.allow_live_delivery === true;

  // Create run
  const { data: run, error: runErr } = await supabase
    .from("pipeline_verification_runs")
    .insert({
      status: "running",
      run_type: "manual",
      mode,
      allow_live_delivery: allowLive,
      target_scope: "contractor_acquisition_full",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (runErr || !run) {
    return new Response(JSON.stringify({ error: "Failed to create run", detail: runErr }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const runId = run.id as string;
  const results: StepResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  async function runStep(
    key: string,
    label: string,
    fn: () => Promise<{ status: StepStatus; error_code?: string; error_message?: string; record_id?: string | null; metadata?: Record<string, unknown> }>,
  ) {
    const startedAt = new Date().toISOString();
    const t0 = Date.now();
    let res: Awaited<ReturnType<typeof fn>>;
    try {
      res = await fn();
    } catch (e) {
      res = { status: "failed", error_code: "EXCEPTION", error_message: (e as Error).message };
    }
    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - t0;

    const entry: StepResult = {
      step_key: key,
      step_label: label,
      status: res.status,
      started_at: startedAt,
      completed_at: completedAt,
      duration_ms: durationMs,
      record_id: res.record_id ?? null,
      error_code: res.error_code ?? null,
      error_message: res.error_message ?? null,
      metadata: res.metadata ?? {},
    };
    results.push(entry);

    if (res.status === "success" || res.status === "skipped") successCount++;
    else failureCount++;

    await supabase.from("pipeline_verification_steps").insert({
      verification_run_id: runId,
      step_key: key,
      step_label: label,
      status: res.status,
      started_at: startedAt,
      completed_at: completedAt,
      duration_ms: durationMs,
      result_payload: { record_id: res.record_id ?? null, metadata: res.metadata ?? {} },
      error_message: res.error_message ?? null,
    });

    // Persist actionable failures to error queue
    if (res.status === "failed" || res.status === "blocked") {
      await supabase.rpc("record_pipeline_error", {
        _category: categoryForStep(key),
        _error_code: res.error_code ?? "STEP_FAILED",
        _error_message: res.error_message ?? `Étape ${label} a échoué`,
        _entity_type: "pipeline_audit",
        _entity_id: runId,
        _step_key: key,
        _recommended_action: recommendationForStep(key),
        _repair_function: repairFnForStep(key),
        _metadata: { mode, ...res.metadata },
      });
    }
  }

  // count-only helper
  async function countRows(table: string, filter?: (q: any) => any): Promise<number> {
    try {
      let q: any = supabase.from(table).select("*", { count: "exact", head: true });
      if (filter) q = filter(q);
      const { count } = await q;
      return count ?? 0;
    } catch { return 0; }
  }

  // ── 01 Sources
  await runStep("01_source_available", "Sources de scraping disponibles", async () => {
    const n = await countRows("outbound_scraping_sources", (q) => q.eq("enabled", true).limit(1));
    if (n === 0) return { status: "warning", error_code: "NO_SOURCES", error_message: "Aucune source active — le scraper ne tournera pas.", metadata: { count: n } };
    return { status: "success", metadata: { count: n } };
  });

  // ── 02 Scrape run recent (last 7 days)
  await runStep("02_scrape_run_created", "Run de scraping créé récemment", async () => {
    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    const n = await countRows("outbound_scraping_runs", (q) => q.gte("created_at", since));
    if (n === 0) return { status: "warning", error_code: "NO_RECENT_RUN", error_message: "Aucun run de scraping dans les 7 derniers jours.", metadata: { count: n } };
    return { status: "success", metadata: { count: n } };
  });

  // ── 03 Listings extracted
  await runStep("03_listing_extracted", "Annonces extraites", async () => {
    const n = await countRows("outbound_scraped_entities");
    if (n === 0) return { status: "warning", error_code: "NO_LISTINGS", error_message: "0 annonce extraite — vérifier scraper." };
    return { status: "success", metadata: { count: n } };
  });

  // ── 04 Prospect created
  const prospectCount = await countRows("contractor_prospects");
  await runStep("04_prospect_created", "Prospect créé", async () => {
    if (prospectCount === 0) return { status: "failed", error_code: "NO_PROSPECTS", error_message: "Aucun prospect en base — le pipeline n'a jamais produit de donnée." };
    return { status: "success", metadata: { count: prospectCount } };
  });

  // ── 05 Dédoublonnage (compter les doublons potentiels sur téléphone)
  await runStep("05_prospect_deduplicated", "Dédoublonnage prospect actif", async () => {
    try {
      const { data } = await supabase.rpc("record_pipeline_error", {
        _category: "noop", _error_code: "noop", _error_message: "noop",
      }).select();
      // Use direct SQL count of duplicates on phone
      const { data: dup, error } = await (supabase as any)
        .from("contractor_prospects")
        .select("phone, id")
        .not("phone", "is", null)
        .limit(2000);
      if (error) return { status: "warning", error_code: "QUERY_ERROR", error_message: error.message };
      const seen = new Map<string, number>();
      for (const row of (dup ?? []) as Array<{ phone: string | null }>) {
        if (!row.phone) continue;
        seen.set(row.phone, (seen.get(row.phone) ?? 0) + 1);
      }
      const dupes = [...seen.values()].filter((v) => v > 1).length;
      if (dupes > 0) return { status: "warning", error_code: "DUPLICATES_PRESENT", error_message: `${dupes} numéros dupliqués trouvés — fusion recommandée.`, metadata: { duplicate_phones: dupes } };
      return { status: "success", metadata: { duplicate_phones: 0 } };
    } catch (e) {
      return { status: "warning", error_code: "DEDUPE_UNKNOWN", error_message: (e as Error).message };
    }
  });

  // ── 06 Phone normalized (E.164)
  await runStep("06_phone_normalized", "Téléphones normalisés (E.164)", async () => {
    const withPhone = await countRows("contractor_prospects", (q) => q.not("phone", "is", null));
    const e164 = await countRows("contractor_prospects", (q) => q.like("phone", "+%"));
    if (withPhone === 0) return { status: "warning", error_code: "NO_PHONES", error_message: "Aucun prospect avec téléphone." };
    if (e164 / withPhone < 0.5) return { status: "warning", error_code: "PHONE_NOT_NORMALIZED", error_message: `Seulement ${e164}/${withPhone} téléphones en E.164.`, metadata: { with_phone: withPhone, e164 } };
    return { status: "success", metadata: { with_phone: withPhone, e164 } };
  });

  // ── 07 Phone type detected
  await runStep("07_phone_type_detected", "Type téléphone détecté (mobile/fixe)", async () => {
    const cached = await countRows("phone_carrier_cache");
    if (cached === 0) return { status: "warning", error_code: "NO_CARRIER_CACHE", error_message: "phone_carrier_cache vide — détection mobile/fixe absente." };
    return { status: "success", metadata: { cached_lookups: cached } };
  });

  // ── 08 Email validated
  await runStep("08_email_validated", "Courriels validés", async () => {
    const withEmail = await countRows("contractor_prospects", (q) => q.not("email", "is", null));
    if (withEmail === 0) return { status: "warning", error_code: "NO_EMAILS", error_message: "Aucun prospect avec courriel." };
    return { status: "success", metadata: { with_email: withEmail } };
  });

  // ── 09 Outreach eligibility
  const outreachTargets = await countRows("outreach_targets");
  await runStep("09_outreach_eligibility_calculated", "Éligibilité outreach calculée", async () => {
    if (outreachTargets === 0) return { status: "warning", error_code: "NO_TARGETS", error_message: "Aucun outreach target — file vide." };
    return { status: "success", metadata: { targets: outreachTargets } };
  });

  // ── 10 Outreach queue
  await runStep("10_outreach_queue_created", "File outreach créée", async () => {
    const queued = await countRows("outreach_targets", (q) => q.in("landing_status", ["prepared", "ready", "queued"]));
    if (queued === 0 && outreachTargets > 0) return { status: "warning", error_code: "QUEUE_EMPTY", error_message: "Cibles présentes mais aucune en file." };
    if (outreachTargets === 0) return { status: "warning", error_code: "NO_TARGETS", error_message: "Aucune cible outreach." };
    return { status: "success", metadata: { queued } };
  });

  // ── 11 SMS or email sent
  const sent = await countRows("contractor_outreach_logs", (q) => q.in("status", ["sent", "delivered", "opened", "clicked"]));
  await runStep("11_sms_or_email_sent", "SMS ou courriel envoyé", async () => {
    if (sent === 0) return { status: "warning", error_code: "NOTHING_SENT", error_message: "Aucun message envoyé." };
    return { status: "success", metadata: { sent } };
  });

  // ── 12 Delivery webhook
  await runStep("12_delivery_status_received", "Statut de livraison reçu (webhook)", async () => {
    const delivered = await countRows("contractor_outreach_logs", (q) => q.in("status", ["delivered", "opened", "clicked"]));
    if (sent > 0 && delivered === 0) return { status: "failed", error_code: "WEBHOOK_MISSING", error_message: "Aucun webhook Twilio/Resend reçu — statuts non mis à jour." };
    if (sent === 0) return { status: "skipped", error_message: "Rien envoyé", metadata: {} };
    return { status: "success", metadata: { delivered } };
  });

  // ── 13 Tracked link created
  const trackedLinks = await countRows("acquisition_tracking_links");
  await runStep("13_tracked_link_created", "Lien tracké créé", async () => {
    if (trackedLinks === 0 && sent > 0) return { status: "warning", error_code: "NO_TRACKING", error_message: "Messages envoyés sans lien tracké." };
    return trackedLinks === 0 ? { status: "warning", error_code: "NO_TRACKING", error_message: "Aucun lien tracké." } : { status: "success", metadata: { tracked_links: trackedLinks } };
  });

  // ── 14 Link opened / clicked
  await runStep("14_tracked_link_opened", "Lien tracké ouvert", async () => {
    const clicked = await countRows("contractor_outreach_logs", (q) => q.not("clicked_at", "is", null));
    if (sent > 0 && clicked === 0) return { status: "warning", error_code: "NO_CLICKS", error_message: "Aucun clic reçu — tracking ou message froid." };
    return { status: "success", metadata: { clicked } };
  });

  // ── 15 Onboarding session
  const onboarding = await countRows("contractor_onboarding_sessions");
  await runStep("15_onboarding_session_created", "Session onboarding créée", async () => {
    if (onboarding === 0) return { status: "warning", error_code: "NO_ONBOARDING", error_message: "Aucune session d'onboarding." };
    return { status: "success", metadata: { onboarding } };
  });

  // ── 16 Prefill
  await runStep("16_profile_prefilled", "Profil prérempli depuis prospect", async () => {
    const filled = await countRows("contractor_onboarding_sessions", (q) => q.not("business_name", "is", null));
    if (onboarding === 0) return { status: "skipped", error_message: "Pas d'onboarding" };
    if (filled === 0) return { status: "warning", error_code: "NO_PREFILL", error_message: "Sessions créées sans prefill du nom." };
    return { status: "success", metadata: { filled } };
  });

  // ── 17 Progress saved
  await runStep("17_onboarding_progress_saved", "Progression onboarding sauvegardée", async () => {
    const progressed = await countRows("contractor_onboarding_sessions", (q) => q.gt("current_step", 0));
    if (onboarding === 0) return { status: "skipped", error_message: "Pas d'onboarding" };
    if (progressed === 0) return { status: "warning", error_code: "NO_PROGRESS", error_message: "Sessions créées mais 0 progression enregistrée." };
    return { status: "success", metadata: { progressed } };
  });

  // ── 18 Plan selected
  await runStep("18_plan_selected", "Plan sélectionné", async () => {
    const planSel = await countRows("contractor_onboarding_sessions", (q) => q.not("selected_plan", "is", null));
    if (onboarding === 0) return { status: "skipped", error_message: "Pas d'onboarding" };
    if (planSel === 0) return { status: "warning", error_code: "NO_PLAN_SELECTED", error_message: "Personne n'a sélectionné de plan." };
    return { status: "success", metadata: { plan_selected: planSel } };
  });

  // ── 19 Checkout session
  const checkouts = await countRows("contractor_checkouts");
  await runStep("19_checkout_session_created", "Session Stripe checkout créée", async () => {
    if (checkouts === 0) return { status: "warning", error_code: "NO_CHECKOUTS", error_message: "Aucune session Stripe créée." };
    return { status: "success", metadata: { checkouts } };
  });

  // ── 20 Payment completed
  const paid = await countRows("contractor_checkouts", (q) => q.in("payment_status", ["paid", "completed"]));
  await runStep("20_stripe_payment_completed", "Paiement Stripe complété", async () => {
    if (checkouts === 0) return { status: "skipped", error_message: "Pas de checkout" };
    if (paid === 0) return { status: "warning", error_code: "NO_PAID", error_message: "Aucun paiement complété." };
    return { status: "success", metadata: { paid, checkouts } };
  });

  // ── 21 Webhook received
  const webhookEvents = await countRows("stripe_webhook_events");
  const webhookProcessed = await countRows("stripe_webhook_events", (q) => q.eq("processing_status", "processed"));
  const webhookFailed = await countRows("stripe_webhook_events", (q) => q.eq("processing_status", "failed"));
  await runStep("21_stripe_webhook_received", "Webhook Stripe reçu et traité", async () => {
    if (webhookEvents === 0) return { status: "warning", error_code: "NO_WEBHOOKS", error_message: "Aucun webhook Stripe reçu — vérifier configuration endpoint." };
    if (webhookFailed > 0 && webhookProcessed === 0) return { status: "failed", error_code: "WEBHOOKS_ALL_FAILED", error_message: `${webhookFailed} webhooks reçus, tous échoués.` };
    if (webhookFailed > webhookProcessed) return { status: "warning", error_code: "WEBHOOKS_MOSTLY_FAILED", error_message: `${webhookFailed} échoués / ${webhookProcessed} traités.` };
    return { status: "success", metadata: { received: webhookEvents, processed: webhookProcessed, failed: webhookFailed } };
  });

  // ── 22 Subscription record
  const subs = await countRows("contractor_subscriptions");
  await runStep("22_subscription_or_activation_record_created", "Abonnement/activation créé", async () => {
    if (subs === 0 && paid > 0) return { status: "failed", error_code: "PAID_NO_SUB", error_message: `${paid} paiements mais 0 abonnement — activation cassée.` };
    if (subs === 0) return { status: "warning", error_code: "NO_SUBS", error_message: "Aucun abonnement." };
    return { status: "success", metadata: { subs } };
  });

  // ── 23 Contractor activated
  const activeSubs = await countRows("contractor_subscriptions", (q) => q.eq("status", "active"));
  await runStep("23_contractor_status_activated", "Statut entrepreneur = actif", async () => {
    if (activeSubs === 0 && subs > 0) return { status: "warning", error_code: "SUBS_NOT_ACTIVE", error_message: "Abonnements présents mais aucun actif." };
    if (activeSubs === 0) return { status: "warning", error_code: "NO_ACTIVE", error_message: "Aucun entrepreneur actif." };
    return { status: "success", metadata: { active: activeSubs } };
  });

  // ── 24 Public profile visible
  const publicProfiles = await countRows("contractor_public_pages", (q) => q.eq("is_published", true).limit(1));
  await runStep("24_public_profile_visible", "Profil public visible", async () => {
    if (publicProfiles === 0 && activeSubs > 0) return { status: "warning", error_code: "NO_PUBLIC_PROFILE", error_message: "Actifs présents mais aucun profil public publié." };
    if (publicProfiles === 0) return { status: "warning", error_code: "NO_PUBLIC", error_message: "Aucun profil public." };
    return { status: "success", metadata: { published: publicProfiles } };
  });

  // ── 25 Matching eligibility
  const eligible = await countRows("contractor_matching_status", (q) => q.eq("is_eligible", true));
  await runStep("25_matching_eligibility_created", "Éligibilité matching créée", async () => {
    if (eligible === 0 && activeSubs > 0) return { status: "failed", error_code: "ACTIVE_NO_MATCHING", error_message: `${activeSubs} actifs sans éligibilité matching.` };
    if (eligible === 0) return { status: "warning", error_code: "NO_ELIGIBLE", error_message: "Aucun contractor éligible matching." };
    return { status: "success", metadata: { eligible } };
  });

  // ── 26 Alex can recommend
  const canBeMatched = await countRows("contractor_entitlements", (q) => q.eq("can_be_matched", true));
  await runStep("26_alex_can_recommend", "Alex peut recommander", async () => {
    if (canBeMatched === 0 && eligible > 0) return { status: "failed", error_code: "ELIGIBLE_NO_ENTITLEMENT", error_message: "Éligibles présents mais entitlement 'can_be_matched' à false." };
    if (canBeMatched === 0) return { status: "warning", error_code: "NO_ENTITLEMENT", error_message: "Aucun entrepreneur autorisé au matching." };
    return { status: "success", metadata: { can_be_matched: canBeMatched } };
  });

  // ── 27 Appointment flow
  await runStep("27_appointment_flow_available", "Flux de réservation disponible", async () => {
    const canAppt = await countRows("contractor_entitlements", (q) => q.eq("can_receive_appointments", true));
    if (canAppt === 0 && canBeMatched > 0) return { status: "warning", error_code: "NO_APPT_ENTITLEMENT", error_message: "Autorisés au matching mais pas aux rendez-vous." };
    if (canAppt === 0) return { status: "warning", error_code: "NO_APPT", error_message: "Aucun entrepreneur ne peut recevoir de rendez-vous." };
    return { status: "success", metadata: { can_appt: canAppt } };
  });

  // Funnel snapshot
  let funnel: Record<string, number> = {};
  try {
    const { data } = await (supabase as any).from("v_pipeline_funnel_counts").select("*").limit(1).maybeSingle();
    funnel = data ?? {};
  } catch { /* ignore */ }

  // Finalize run
  await supabase
    .from("pipeline_verification_runs")
    .update({
      status: failureCount === 0 ? "completed" : "completed_with_errors",
      completed_at: new Date().toISOString(),
      success_count: successCount,
      failure_count: failureCount,
      summary: `${successCount}/${STEPS.length} étapes OK — mode=${mode}`,
      operational_status: { funnel, mode, allow_live_delivery: allowLive },
    })
    .eq("id", runId);

  return new Response(
    JSON.stringify({
      run_id: runId,
      mode,
      allow_live_delivery: allowLive,
      total_steps: STEPS.length,
      success_count: successCount,
      failure_count: failureCount,
      funnel,
      steps: results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
  );
});

function categoryForStep(key: string): string {
  if (key.includes("phone")) return "phone_validation";
  if (key.includes("email")) return "email";
  if (key.includes("sms")) return "sms";
  if (key.includes("scrape") || key.includes("source") || key.includes("listing")) return "scraping";
  if (key.includes("dedup")) return "deduplication";
  if (key.includes("outreach") || key.includes("tracked")) return "tracking";
  if (key.includes("onboarding") || key.includes("prefill") || key.includes("plan")) return "onboarding";
  if (key.includes("checkout") || key.includes("payment")) return "stripe";
  if (key.includes("webhook")) return "webhook";
  if (key.includes("subscription") || key.includes("activated") || key.includes("profile")) return "activation";
  if (key.includes("matching")) return "matching";
  if (key.includes("alex") || key.includes("recommend") || key.includes("appointment")) return "alex";
  return "pipeline";
}

function recommendationForStep(key: string): string {
  const map: Record<string, string> = {
    "01_source_available": "Ajouter au moins une source active dans outbound_scraping_sources.",
    "02_scrape_run_created": "Déclencher manuellement un run via /admin/acquisition-machine.",
    "04_prospect_created": "Vérifier la fonction execute-prospect-pipeline.",
    "06_phone_normalized": "Lancer un script de normalisation E.164 sur contractor_prospects.phone.",
    "11_sms_or_email_sent": "Vérifier les cadences et provider settings Twilio/Resend.",
    "12_delivery_status_received": "Configurer les Status Callback URLs Twilio et Resend webhook endpoints.",
    "20_stripe_payment_completed": "Tester create-stripe-checkout-session en mode test.",
    "21_stripe_webhook_received": "Vérifier STRIPE_WEBHOOK_SECRET et l'URL /stripe-webhook.",
    "22_subscription_or_activation_record_created": "Retraiter les stripe_webhook_events en status=failed.",
    "23_contractor_status_activated": "Vérifier la fonction admin_activate_contractor_finalize.",
    "25_matching_eligibility_created": "Créer une ligne dans contractor_matching_status pour chaque actif.",
    "26_alex_can_recommend": "Activer contractor_entitlements.can_be_matched pour l'entrepreneur.",
  };
  return map[key] ?? "Consulter les logs et l'edge function correspondante.";
}

function repairFnForStep(key: string): string | null {
  if (key.startsWith("21_stripe_webhook")) return "stripe-webhook-reprocess";
  if (key.startsWith("22_") || key.startsWith("23_")) return "repair-stuck-contractor-pipeline";
  if (key.startsWith("25_") || key.startsWith("26_")) return "repair-matching-eligibility";
  return null;
}

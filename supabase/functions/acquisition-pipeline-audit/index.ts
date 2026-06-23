// Acquisition Pipeline Audit Orchestrator v2 — Telemetry-aware
// Never returns "no leaks" when there is no data. Distinguishes VERIFIED / PARTIAL / UNKNOWN.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAGE_ORDER = [
  "scraped", "contacted", "delivered", "opened", "clicked",
  "registered", "onboarded", "paid", "active",
] as const;

const DATA_TABLES = [
  "contractors", "contractor_leads", "contractor_prospects", "companies",
  "contractor_outreach_logs", "campaign_send_log", "outreach_campaigns",
  "profiles", "acquisition_funnel_state",
];

function dq(row: Record<string, unknown>): number {
  const fields = ["business_name", "rbq_number", "neq_number", "website", "phone", "email", "city", "category"];
  let score = 0;
  for (const f of fields) if (row[f]) score += Math.floor(100 / fields.length);
  return Math.min(100, score);
}

function classifyEmailRole(email: string | null): string | null {
  if (!email) return null;
  const local = email.toLowerCase().split("@")[0] ?? "";
  if (/^(info|contact|hello|admin)/.test(local)) return "info";
  if (/^(sales|ventes)/.test(local)) return "sales";
  if (/^(support|help|service)/.test(local)) return "support";
  if (/^(owner|ceo|president|direction)/.test(local)) return "owner";
  return "personal";
}

function emailQuality(email: string | null): number {
  if (!email) return 0;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 10;
  const role = classifyEmailRole(email);
  if (role === "owner") return 95;
  if (role === "personal") return 80;
  if (role === "sales") return 70;
  if (role === "info") return 55;
  return 40;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: run } = await supabase
    .from("acquisition_audit_runs")
    .insert({ status: "running" })
    .select()
    .single();
  const runId = run?.id as string;

  const findings: Array<Record<string, unknown>> = [];
  const recoveryQueue: Array<Record<string, unknown>> = [];
  const silentFailures: Array<Record<string, unknown>> = [];
  let audited = 0;
  let autoRepairs = 0;
  let totalLost = 0;
  let totalRecoverable = 0;

  try {
    // ============ PHASE 0 — Data Availability Check ============
    const availability: Record<string, { rows: number; last_at: string | null; status: string }> = {};
    await Promise.all(DATA_TABLES.map(async (table) => {
      try {
        const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
        const { data: latest } = await supabase
          .from(table).select("created_at").order("created_at", { ascending: false }).limit(1);
        const lastAt = (latest?.[0] as any)?.created_at ?? null;
        const rows = count ?? 0;
        availability[table] = {
          rows,
          last_at: lastAt,
          status: rows === 0 ? "critical" : rows < 10 ? "warning" : "healthy",
        };
      } catch (_e) {
        availability[table] = { rows: 0, last_at: null, status: "unknown" };
      }
    }));

    // ============ PHASE 0b — Event counts per stage ============
    const eventCounts: Record<string, { total: number; last_at: string | null }> = {};
    await Promise.all(STAGE_ORDER.map(async (stage) => {
      try {
        const { count } = await supabase.from("contractor_leads")
          .select("*", { count: "exact", head: true })
          .eq("pipeline_status", stage);
        const { data: latest } = await supabase.from("contractor_leads")
          .select("updated_at").eq("pipeline_status", stage)
          .order("updated_at", { ascending: false }).limit(1);
        eventCounts[stage] = {
          total: count ?? 0,
          last_at: (latest?.[0] as any)?.updated_at ?? null,
        };
      } catch (_e) {
        eventCounts[stage] = { total: 0, last_at: null };
      }
    }));

    // Outreach delivery telemetry
    const { count: outreachSent } = await supabase.from("contractor_outreach_logs")
      .select("*", { count: "exact", head: true });
    const { count: smsSent } = await supabase.from("contractor_outreach_logs")
      .select("*", { count: "exact", head: true }).eq("channel", "sms");
    const { count: smsDelivered } = await supabase.from("contractor_outreach_logs")
      .select("*", { count: "exact", head: true }).eq("channel", "sms").eq("status", "delivered");
    const { count: emailSent } = await supabase.from("contractor_outreach_logs")
      .select("*", { count: "exact", head: true }).eq("channel", "email");
    const { count: emailDelivered } = await supabase.from("contractor_outreach_logs")
      .select("*", { count: "exact", head: true }).eq("channel", "email").eq("status", "delivered");
    const totalClicks = eventCounts.clicked?.total ?? 0;

    // ============ PHASE 0c — Silent failure detection ============
    const totalContractors = availability["contractors"]?.rows ?? 0;
    const totalLeads = availability["contractor_leads"]?.rows ?? 0;
    const totalEvents = Object.values(eventCounts).reduce((s, e) => s + e.total, 0);

    // Scraper stalled
    const last24h = new Date(Date.now() - 86_400_000).toISOString();
    const { count: recentLeads } = await supabase.from("contractor_leads")
      .select("*", { count: "exact", head: true }).gte("created_at", last24h);
    if ((recentLeads ?? 0) === 0 && totalContractors === 0) {
      silentFailures.push({
        code: "SCRAPER_STALLED",
        severity: "critical",
        description: "0 contractors ajoutés au cours des dernières 24h — le scraper semble arrêté.",
        recommended_action: "Vérifier l'edge function de scraping et les logs de la dernière exécution.",
      });
    }

    if ((smsSent ?? 0) > 0 && (smsDelivered ?? 0) === 0) {
      silentFailures.push({
        code: "SMS_DELIVERY_FAILURE",
        severity: "critical",
        description: `${smsSent} SMS envoyés, 0 livrés — possible panne Twilio ou credentials invalides.`,
        recommended_action: "Vérifier Twilio dashboard + secret TWILIO_AUTH_TOKEN.",
      });
    }

    if ((emailSent ?? 0) > 0 && (emailDelivered ?? 0) === 0) {
      silentFailures.push({
        code: "EMAIL_DELIVERY_FAILURE",
        severity: "critical",
        description: `${emailSent} emails envoyés, 0 livrés — webhook Resend muet ou bounces 100%.`,
        recommended_action: "Vérifier Resend dashboard + DNS SPF/DKIM/DMARC.",
      });
    }

    if ((outreachSent ?? 0) > 0 && totalClicks === 0) {
      silentFailures.push({
        code: "TRACKING_PIPELINE_FAILURE",
        severity: "high",
        description: `${outreachSent} messages envoyés, 0 click enregistré — le tracking ne capte rien.`,
        recommended_action: "Vérifier le redirect tracker et l'edge function d'attribution.",
      });
    }

    // ============ PHASE 0e — Event-source-of-truth checks (acquisition_events) ============
    async function evCount(eventType: string, provider?: string): Promise<number> {
      let q = supabase.from("acquisition_events").select("*", { count: "exact", head: true }).eq("event_type", eventType);
      if (provider) q = q.eq("provider", provider);
      const { count } = await q;
      return count ?? 0;
    }
    const [evSentTwilio, evDelivTwilio, evSentResend, evDelivResend, evClickedAll, evRegistered, evOnboarded, evPaid, evActive, trackingLinksCount] = await Promise.all([
      evCount("sent", "twilio"), evCount("delivered", "twilio"),
      evCount("sent", "resend"), evCount("delivered", "resend"),
      evCount("clicked"), evCount("registered"), evCount("onboarded"), evCount("paid"), evCount("active"),
      supabase.from("acquisition_tracking_links").select("*", { count: "exact", head: true }).then(r => r.count ?? 0),
    ]);

    if (evSentTwilio > 0 && evDelivTwilio === 0) {
      silentFailures.push({
        code: "TWILIO_WEBHOOK_MISSING", severity: "critical",
        description: `${evSentTwilio} SMS envoyés mais aucun événement de livraison reçu — webhook Twilio non configuré.`,
        recommended_action: "Configurer le Status Callback URL Twilio → /twilio-status-events.",
      });
    }
    if (evSentResend > 0 && evDelivResend === 0) {
      silentFailures.push({
        code: "RESEND_WEBHOOK_MISSING", severity: "critical",
        description: `${evSentResend} emails envoyés mais aucun événement Resend reçu — webhook absent.`,
        recommended_action: "Ajouter le webhook Resend → /resend-events.",
      });
    }
    if ((outreachSent ?? 0) > 0 && trackingLinksCount === 0) {
      silentFailures.push({
        code: "TRACKING_LINKS_BYPASSED", severity: "high",
        description: `${outreachSent} messages envoyés sans aucun lien de tracking /r/ — clics non attribuables.`,
        recommended_action: "Réécrire les URLs sortantes via acquisition_tracking_links + /r/{id}.",
      });
    }
    if (evRegistered > 0 && evOnboarded === 0) {
      silentFailures.push({
        code: "ONBOARDING_GAP", severity: "high",
        description: `${evRegistered} profils créés, 0 onboarding complété — étape d'onboarding bloque la conversion.`,
        recommended_action: "Vérifier le flow d'onboarding entrepreneur + déclencheur 'onboarded' event.",
      });
    }
    if (evPaid > 0 && evActive < evPaid) {
      silentFailures.push({
        code: "PAID_NOT_ACTIVATED", severity: "critical",
        description: `${evPaid} contractors payés mais seulement ${evActive} publiés/actifs — paiement sans activation.`,
        recommended_action: "Vérifier post-payment activation (publish_contractor edge function + Stripe webhook).",
      });
    }

    // Profiles without attribution
    const { count: profilesNoAttribution } = await supabase
      .from("profiles").select("*", { count: "exact", head: true });
    const { count: registeredFromEvents } = await supabase
      .from("acquisition_events").select("*", { count: "exact", head: true })
      .eq("event_type", "registered").not("metadata->>backfill", "is", null);
    if ((profilesNoAttribution ?? 0) > 0 && trackingLinksCount === 0 && evClickedAll === 0) {
      silentFailures.push({
        code: "NO_REGISTRATION_ATTRIBUTION", severity: "medium",
        description: `${profilesNoAttribution} profils créés sans tracking_id — attribution de campagne impossible.`,
        recommended_action: "Propager tracking_id depuis /r/{id} → signup form → registered event.",
      });
    }

    // ============ PHASE 0d — Confidence score ============
    let confidence = 0;
    if (totalContractors > 0) confidence += 30;
    if (totalLeads > 0) confidence += 30;
    if (totalEvents > 0) confidence += 20;
    if ((outreachSent ?? 0) > 0) confidence += 10;
    if (totalClicks > 0) confidence += 10;
    confidence = Math.min(100, confidence);

    const systemStatus =
      confidence >= 95 ? "healthy" :
      confidence >= 50 ? "warning" :
      confidence > 0 ? "critical" : "unknown";

    // Always emit a telemetry finding when confidence is too low
    if (confidence < 50) {
      findings.push({
        run_id: runId,
        phase: "P0_telemetry",
        severity: "critical",
        issue_code: "acquisition_telemetry_unavailable",
        issue_description:
          `Confidence ${confidence}/100 — télémétrie d'acquisition insuffisante. ` +
          `Le système ne peut pas déterminer si des fuites de revenus existent ` +
          `car aucune activité de funnel mesurable n'est captée. ` +
          `Vérifier : Scraper, Tracking, Twilio, Resend, Stripe, Event Pipeline.`,
        lost_revenue_cad: null,
        recoverable_revenue_cad: null,
        repair_difficulty: 5,
        auto_repairable: false,
        status: "open",
      });
    }

    // ============ PHASE 1-15 — Leak detection (only meaningful if data exists) ============
    const { data: leads = [] } = await supabase
      .from("contractor_leads")
      .select("id, business_name, city, phone, email, pipeline_status, created_at")
      .limit(500);

    const MRR = 349;
    const RECOVERY_CADENCE_HOURS: Record<string, number> = {
      A_clicked_not_registered: 24,
      B_registered_not_completed: 48,
      C_completed_not_paid: 72,
      D_paid_not_activated: 120,
    };

    for (const lead of leads ?? []) {
      audited++;
      const stage = (lead as any).pipeline_status || "scraped";
      const dataScore = dq(lead as any);
      const emailScore = emailQuality((lead as any).email);
      const emailRole = classifyEmailRole((lead as any).email);
      const phone = (lead as any).phone as string | null;
      const smsEligible = !!phone && /^\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(phone);
      const stageIdx = STAGE_ORDER.indexOf(stage as any);
      const completionPct = stageIdx >= 0 ? Math.round(((stageIdx + 1) / STAGE_ORDER.length) * 100) : 10;

      await supabase.from("acquisition_funnel_state").upsert({
        contractor_id: (lead as any).id,
        business_name: (lead as any).business_name,
        city: (lead as any).city,
        scraped_at: (lead as any).created_at,
        current_stage: stage,
        data_quality_score: dataScore,
        sms_eligible: smsEligible,
        email_quality_score: emailScore,
        email_role: emailRole,
        profile_completion_pct: completionPct,
        estimated_mrr_cad: MRR,
        last_audited_at: new Date().toISOString(),
      }, { onConflict: "contractor_id" });

      if (dataScore < 50) {
        findings.push({
          run_id: runId, contractor_id: (lead as any).id, phase: "P1_data_quality",
          severity: "high", issue_code: "low_data_quality",
          issue_description: `Data quality ${dataScore}/100 — missing core fields`,
          lost_revenue_cad: MRR, recoverable_revenue_cad: MRR * 0.4,
          repair_difficulty: 3, auto_repairable: false, status: "open",
        });
        totalLost += MRR; totalRecoverable += MRR * 0.4;
      }
      if (!phone) {
        findings.push({
          run_id: runId, contractor_id: (lead as any).id, phase: "P2_phone",
          severity: "medium", issue_code: "missing_phone",
          issue_description: "No phone — SMS channel unavailable",
          lost_revenue_cad: MRR * 0.3, recoverable_revenue_cad: MRR * 0.2,
          repair_difficulty: 2, auto_repairable: false, status: "open",
        });
      }
      if (emailScore < 40) {
        findings.push({
          run_id: runId, contractor_id: (lead as any).id, phase: "P3_email",
          severity: emailScore === 0 ? "high" : "medium",
          issue_code: emailScore === 0 ? "missing_email" : "low_email_quality",
          issue_description: emailScore === 0 ? "No email captured" : "Generic/role inbox — low reply rate",
          lost_revenue_cad: MRR * 0.5, recoverable_revenue_cad: MRR * 0.3,
          repair_difficulty: 3, auto_repairable: false, status: "open",
        });
      }

      const STAGE_REVENUE_LOSS: Record<string, number> = {
        scraped: MRR * 0.05, contacted: MRR * 0.1, delivered: MRR * 0.15,
        opened: MRR * 0.25, clicked: MRR * 0.4, registered: MRR * 0.6,
        onboarded: MRR * 0.8, paid: MRR * 0.95,
      };
      let recoveryType: string | null = null;
      if (stage === "clicked") recoveryType = "A_clicked_not_registered";
      else if (stage === "registered") recoveryType = "B_registered_not_completed";
      else if (stage === "onboarded") recoveryType = "C_completed_not_paid";
      else if (stage === "paid") recoveryType = "D_paid_not_activated";

      if (recoveryType) {
        const loss = STAGE_REVENUE_LOSS[stage] ?? 0;
        totalLost += loss; totalRecoverable += loss * 0.5;
        findings.push({
          run_id: runId, contractor_id: (lead as any).id, phase: "P14_leak",
          stage_from: stage, stage_to: STAGE_ORDER[stageIdx + 1] ?? "active",
          severity: stage === "paid" ? "critical" : "high",
          issue_code: `stuck_at_${stage}`,
          issue_description: `Contractor stalled at "${stage}" — recovery campaign required`,
          lost_revenue_cad: loss, recoverable_revenue_cad: loss * 0.5,
          repair_difficulty: 2, auto_repairable: true, status: "open",
        });
        const hours = RECOVERY_CADENCE_HOURS[recoveryType];
        const scheduledAt = new Date(Date.now() + hours * 3600_000).toISOString();
        const channel = smsEligible && stage !== "paid" ? "sms" : "email";
        recoveryQueue.push({
          contractor_id: (lead as any).id,
          campaign_type: recoveryType, channel, scheduled_at: scheduledAt, status: "queued",
          payload: { stage, business_name: (lead as any).business_name },
        });
      }
      if (stage === "paid") autoRepairs++;
    }

    if (findings.length) await supabase.from("acquisition_findings").insert(findings);
    if (recoveryQueue.length) await supabase.from("acquisition_recovery_queue").insert(recoveryQueue);

    await supabase.from("acquisition_audit_runs").update({
      status: "completed",
      completed_at: new Date().toISOString(),
      phases_completed: ["P0_telemetry","P1","P2","P3","P14","P15"],
      contractors_audited: audited,
      findings_created: findings.length,
      auto_repairs: autoRepairs,
      recovery_enqueued: recoveryQueue.length,
      total_lost_revenue_cad: totalLost,
      total_recoverable_cad: totalRecoverable,
      confidence_score: confidence,
      system_status: systemStatus,
      data_availability: availability,
      event_counts: eventCounts,
      silent_failures: silentFailures,
    }).eq("id", runId);

    return new Response(JSON.stringify({
      run_id: runId, audited, findings: findings.length,
      recovery_enqueued: recoveryQueue.length, auto_repairs: autoRepairs,
      total_lost_revenue_cad: totalLost, total_recoverable_cad: totalRecoverable,
      confidence_score: confidence, system_status: systemStatus,
      data_availability: availability, event_counts: eventCounts,
      silent_failures: silentFailures,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    await supabase.from("acquisition_audit_runs").update({
      status: "failed", completed_at: new Date().toISOString(),
      error: e instanceof Error ? e.message : String(e),
    }).eq("id", runId);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

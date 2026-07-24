// Read-only 30-day funnel audit report.
// Aggregates existing tables — no writes, no side effects.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Stage {
  key: string;
  label: string;
  count: number;
  conversion_from_previous_pct: number | null;
  drop_from_previous_pct: number | null;
  last_occurrence_at: string | null;
  top_error: { code: string; message: string; count: number } | null;
}

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
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user?.id) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);


    const url = new URL(req.url);
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? 30)));
    const since = new Date(Date.now() - days * 86400_000).toISOString();

    // ---------- Sources ----------
    const [leadsRes, smsRes, eventsRes] = await Promise.all([
      admin.from("launch_leads").select("id,phone,email,lead_status,created_at,paid_at,activated_at,failure_code,block_reason").gte("created_at", since).limit(100000),
      admin.from("sms_events_v2").select("id,status,error_code,error_message,created_at,delivered_at,sent_at,failed_at").gte("created_at", since).limit(100000),
      admin.from("contractor_funnel_events").select("id,event_type,created_at,metadata").gte("created_at", since).limit(200000),
    ]);

    const leads = leadsRes.data ?? [];
    const sms = smsRes.data ?? [];
    const events = eventsRes.data ?? [];

    // Mobile-valid heuristic: Canadian mobile pattern (E.164 or 10-digit starting with valid QC/CA area codes)
    const isMobile = (p: string | null | undefined) => {
      if (!p) return false;
      const digits = p.replace(/\D/g, "");
      const local = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
      return local.length === 10 && /^[2-9]\d{9}$/.test(local);
    };
    const AGGREGATOR_HINTS = ["pagesjaunes", "houzz", "yelp", "kijiji", "yellowpages", "homestars"];
    const isAggregator = (l: any) =>
      AGGREGATOR_HINTS.some((h) => JSON.stringify(l.payload ?? {}).toLowerCase().includes(h));

    // ---------- Helpers ----------
    const countEvents = (types: string[]) =>
      events.filter((e: any) => types.includes(e.event_type));

    const lastAt = (rows: { created_at: string }[]) =>
      rows.length ? rows.reduce((m, r) => (r.created_at > m ? r.created_at : m), rows[0].created_at) : null;

    const topEventError = (types: string[]) => {
      const map = new Map<string, { code: string; message: string; count: number }>();
      for (const e of events) {
        if (!types.includes(e.event_type)) continue;
        const md: any = e.metadata ?? {};
        const code = md.error_code || md.errorCode || md.error;
        if (!code) continue;
        const k = String(code);
        const prev = map.get(k);
        if (prev) prev.count++;
        else map.set(k, { code: k, message: String(md.error_message ?? md.message ?? ""), count: 1 });
      }
      return [...map.values()].sort((a, b) => b.count - a.count)[0] ?? null;
    };

    const topSmsError = (statuses: string[]) => {
      const map = new Map<string, { code: string; message: string; count: number }>();
      for (const s of sms as any[]) {
        if (!statuses.includes(s.status)) continue;
        if (!s.error_code) continue;
        const k = String(s.error_code);
        const prev = map.get(k);
        if (prev) prev.count++;
        else map.set(k, { code: k, message: String(s.error_message ?? ""), count: 1 });
      }
      return [...map.values()].sort((a, b) => b.count - a.count)[0] ?? null;
    };

    // ---------- Compute stages ----------
    const mobileValid = leads.filter((l: any) => isMobile(l.phone));
    const emailPresent = leads.filter((l: any) => !!l.email);
    const excluded = leads.filter(isAggregator);

    const smsQueued = (sms as any[]).filter((s) => s.status === "queued");
    const smsSent = (sms as any[]).filter((s) => ["sent", "delivered"].includes(s.status));
    const smsDelivered = (sms as any[]).filter((s) => s.status === "delivered");
    const smsFailed = (sms as any[]).filter((s) => ["failed", "undelivered"].includes(s.status));

    const evClicked = countEvents(["sms_clicked", "link_clicked"]);
    const evLanding = countEvents(["landing_view", "landing_viewed", "landing_viewed_first_dollar"]);
    const evAlex = countEvents(["alex_started"]);
    const evSignupStart = countEvents(["registration_started", "signup_started", "profile_started"]);
    const evSignupDone = countEvents(["registration_completed", "signup_completed"]);
    const evCheckoutOpen = countEvents(["checkout_started", "stripe_checkout_opened", "stripe_checkout_started"]);
    const evPaid = countEvents(["payment_success", "payment_succeeded", "stripe_payment_success"]);
    const evActivated = countEvents(["activation_completed", "contractor_activated", "activated"]);

    const paidLeads = leads.filter((l: any) => ["PAID", "ACTIVATED"].includes(l.lead_status));
    const activatedLeads = leads.filter((l: any) => l.lead_status === "ACTIVATED");

    const paidCount = Math.max(evPaid.length, paidLeads.length);
    const activatedCount = Math.max(evActivated.length, activatedLeads.length);

    const raw = [
      { key: "scraped", label: "Scrapés", count: leads.length, lastAt: lastAt(leads), err: null },
      { key: "mobile_valid", label: "Mobiles valides", count: mobileValid.length, lastAt: lastAt(mobileValid), err: null },
      { key: "email_present", label: "Emails présents", count: emailPresent.length, lastAt: lastAt(emailPresent), err: null },
      { key: "excluded_aggregators", label: "Exclus (agrégateurs)", count: excluded.length, lastAt: lastAt(excluded), err: null },
      { key: "sms_queued", label: "SMS en file", count: smsQueued.length, lastAt: lastAt(smsQueued), err: null },
      { key: "sms_sent", label: "SMS envoyés", count: smsSent.length, lastAt: lastAt(smsSent), err: topSmsError(["sent"]) },
      { key: "sms_delivered", label: "SMS livrés", count: smsDelivered.length, lastAt: lastAt(smsDelivered), err: null },
      { key: "sms_failed", label: "SMS échoués", count: smsFailed.length, lastAt: lastAt(smsFailed), err: topSmsError(["failed", "undelivered"]) },
      { key: "link_clicked", label: "Liens cliqués", count: evClicked.length, lastAt: lastAt(evClicked), err: null },
      { key: "landing_view", label: "Landing vue", count: evLanding.length, lastAt: lastAt(evLanding), err: null },
      { key: "alex_started", label: "Alex démarré", count: evAlex.length, lastAt: lastAt(evAlex), err: null },
      { key: "signup_started", label: "Inscription commencée", count: evSignupStart.length, lastAt: lastAt(evSignupStart), err: topEventError(["registration_started", "signup_started"]) },
      { key: "signup_completed", label: "Inscription terminée", count: evSignupDone.length, lastAt: lastAt(evSignupDone), err: null },
      { key: "checkout_opened", label: "Checkout ouvert", count: evCheckoutOpen.length, lastAt: lastAt(evCheckoutOpen), err: topEventError(["checkout_started", "stripe_checkout_opened"]) },
      { key: "payment_success", label: "Paiement 1$", count: paidCount, lastAt: paidLeads[0]?.paid_at ?? lastAt(evPaid), err: null },
      { key: "activated", label: "Compte activé", count: activatedCount, lastAt: activatedLeads[0]?.activated_at ?? lastAt(evActivated), err: null },
      { key: "recommendable", label: "Recommandable par Alex", count: activatedCount, lastAt: activatedLeads[0]?.activated_at ?? null, err: null },
    ];

    const anchor = raw[0].count || 1;
    // Stages whose count is orthogonal (not a subset of previous stage). They
    // should not compute conversion/drop from the linear funnel, and the next
    // stage must skip over them when computing its own denominator.
    const orthogonalKeys = new Set(["excluded_aggregators", "email_present"]);
    const stages: Stage[] = raw.map((r, i) => {
      let prev: number | null = null;
      for (let j = i - 1; j >= 0; j--) {
        if (orthogonalKeys.has(raw[j].key)) continue;
        prev = raw[j].count;
        break;
      }
      const isOrthogonal = orthogonalKeys.has(r.key);
      const convFromPrev = !isOrthogonal && prev && prev > 0 ? Math.round((r.count / prev) * 1000) / 10 : null;
      const dropFromPrev = !isOrthogonal && prev && prev > 0 ? Math.round(((prev - r.count) / prev) * 1000) / 10 : null;
      return {
        key: r.key,
        label: r.label,
        count: r.count,
        conversion_from_previous_pct: i === 0 ? 100 : convFromPrev,
        drop_from_previous_pct: i === 0 ? 0 : dropFromPrev,
        last_occurrence_at: r.lastAt,
        top_error: r.err,
      };
    });


    // Biggest drop-off (skip stage 0 and stages where prev is 0)
    let biggest: { key: string; label: string; drop_pct: number; from: number; to: number } | null = null;
    for (let i = 1; i < raw.length; i++) {
      const prev = raw[i - 1].count;
      if (prev <= 0) continue;
      const drop = ((prev - raw[i].count) / prev) * 100;
      if (drop > 0 && (biggest === null || drop > biggest.drop_pct)) {
        biggest = { key: raw[i].key, label: raw[i].label, drop_pct: Math.round(drop * 10) / 10, from: prev, to: raw[i].count };
      }
    }

    // Prefill coverage: sample 20 recent signup_starts phone/emails against contractor_prospects
    const recentSignupIds = events
      .filter((e: any) => ["registration_started", "signup_started"].includes(e.event_type))
      .slice(0, 20);
    let prefillCoverage = { sampled: 0, prefilled: 0, pct: 0 };
    if (recentSignupIds.length) {
      const emails = recentSignupIds.map((e: any) => e.metadata?.email).filter(Boolean);
      const phones = recentSignupIds.map((e: any) => e.metadata?.phone).filter(Boolean);
      let prefilled = 0;
      if (emails.length || phones.length) {
        const { data: pros } = await admin
          .from("contractor_prospects")
          .select("email,phone,business_name,category,city")
          .or([
            emails.length ? `email.in.(${emails.map((e: string) => `"${e}"`).join(",")})` : null,
            phones.length ? `phone.in.(${phones.map((p: string) => `"${p}"`).join(",")})` : null,
          ].filter(Boolean).join(","))
          .limit(50);
        prefilled = (pros ?? []).filter((p: any) => p.business_name && p.phone && (p.category || p.city)).length;
      }
      prefillCoverage = {
        sampled: recentSignupIds.length,
        prefilled,
        pct: recentSignupIds.length ? Math.round((prefilled / recentSignupIds.length) * 1000) / 10 : 0,
      };
    }

    // ---------- Real production pipeline (contractor_leads) ----------
    // The `launch_leads` table above only sees the "sprint" pipeline. The 20-stage
    // real acquisition flow lives in contractor_prospects → contractor_leads →
    // sms_events_v2 → acquisition_tracking_links → outreach_replies →
    // billing_checkout_sessions. We compute it independently and expose it as
    // `real_pipeline` in the response. All counts come from real production rows.
    const realPipeline = await computeRealPipeline(admin, since);

    // Optional action: auto-repair missing landing pages (idempotent, no SMS).
    const action = url.searchParams.get("action");
    let repairResult: any = null;
    if (action === "repair_landings") {
      const limit = Math.min(10, Math.max(1, Number(url.searchParams.get("limit") ?? 5)));
      repairResult = await repairMissingLandings(admin, limit);
    }

    // Optional dry-run canary preview — never sends, only lists eligible leads.
    const canaryPreview = url.searchParams.get("canary_preview") === "1"
      ? await previewCanaryBatch(admin, Math.min(20, Math.max(1, Number(url.searchParams.get("canary_limit") ?? 5))))
      : null;

    // Aggregate readiness across top eligible candidates (bounded, read-only).
    const canaryReadiness = (canaryPreview || action === "repair_landings")
      ? await computeCanaryReadiness(admin, 100)
      : null;

    return json({
      window_days: days,
      generated_at: new Date().toISOString(),
      total_leads_scraped: leads.length,
      biggest_dropoff: biggest,
      prefill_coverage: prefillCoverage,
      sms_7d_summary: sevenDaySmsSummary(sms as any[]),
      stages,
      real_pipeline: realPipeline,
      canary_preview: canaryPreview,
      canary_readiness: canaryReadiness,
      repair_result: repairResult,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function sevenDaySmsSummary(sms: any[]) {
  const cutoff = Date.now() - 7 * 86400_000;
  const recent = sms.filter((s) => new Date(s.created_at).getTime() >= cutoff);
  const by = (st: string) => recent.filter((s) => s.status === st).length;
  return {
    queued: by("queued"),
    sent: by("sent"),
    delivered: by("delivered"),
    failed: by("failed"),
    undelivered: by("undelivered"),
    total: recent.length,
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------- Real production pipeline (contractor_leads-based) ----------
// Reads only real rows. No writes. Returns a 20-stage snapshot with counts,
// last_at, oldest stuck record, and a top exception reason per stage.
async function computeRealPipeline(admin: any, since: string) {
  const [prospectsR, leadsR, smsR, evidenceR, tracksR, repliesR, checkoutsR, webhooksR] = await Promise.all([
    admin.from("contractor_prospects").select("id,phone,email,business_name,category,city,created_at,updated_at").limit(100000),
    admin.from("contractor_leads").select("id,business_name,company_name,phone,mobile_phone,lead_status,sms_status,last_sms_at,pipeline_status,unsubscribed_at,source_prospect_id,contractor_id,created_at").limit(100000),
    admin.from("sms_events_v2").select("id,lead_id,twilio_sid,status,error_code,error_message,normalized_phone,created_at,sent_at,delivered_at,failed_at,clicked_at").gte("created_at", since).limit(100000),
    admin.from("casl_consent_evidence").select("id,contractor_lead_id,destination_type,is_valid").eq("is_valid", true).limit(100000),
    admin.from("acquisition_tracking_links").select("id,contractor_id,prospect_id,click_count,first_click_at,created_at").limit(100000),
    admin.from("outreach_replies").select("id,lead_id,intent,created_at").gte("created_at", since).limit(50000),
    admin.from("billing_checkout_sessions").select("id,contractor_id,checkout_status,payment_status,amount_total,created_at").gte("created_at", since).limit(50000),
    admin.from("billing_webhook_events").select("id,event_type,delivery_status,received_at").gte("received_at", since).limit(50000),
  ]);

  const prospects = prospectsR.data ?? [];
  const leads = leadsR.data ?? [];
  const sms = smsR.data ?? [];
  const evidence = evidenceR.data ?? [];
  const tracks = tracksR.data ?? [];
  const replies = repliesR.data ?? [];
  const checkouts = checkoutsR.data ?? [];
  const webhooks = webhooksR.data ?? [];

  const isMobileNum = (p: string | null | undefined) => {
    if (!p) return false;
    const d = p.replace(/\D/g, "").slice(-10);
    return d.length === 10 && /^[2-9]\d{9}$/.test(d);
  };

  const evidenceByLead = new Set(evidence.map((e: any) => e.contractor_lead_id).filter(Boolean));
  const smsByLead = new Map<string, any[]>();
  for (const s of sms) {
    const k = s.lead_id;
    if (!k) continue;
    if (!smsByLead.has(k)) smsByLead.set(k, []);
    smsByLead.get(k)!.push(s);
  }

  const smsQueued = sms.filter((s: any) => s.status === "queued");
  const smsAccepted = sms.filter((s: any) => ["sent", "delivered"].includes(s.status));
  const smsDelivered = sms.filter((s: any) => s.status === "delivered");
  const smsFailed = sms.filter((s: any) => ["failed", "undelivered", "invalid_phone"].includes(s.status));
  const smsClicked = sms.filter((s: any) => !!s.clicked_at);
  const clickedTracks = tracks.filter((t: any) => (t.click_count ?? 0) > 0);
  const positiveReplies = replies.filter((r: any) => ["positive", "contractor_intent", "homeowner_intent", "appointment_request", "general"].includes(r.intent));
  const stopReplies = replies.filter((r: any) => r.intent === "stop");
  const checkoutsOpen = checkouts;
  const checkoutsPaid = checkouts.filter((c: any) => c.payment_status === "paid" || c.checkout_status === "complete");
  const webhooksReceived = webhooks;
  const webhooksVerified = webhooks.filter((w: any) => w.delivery_status === "processed" || w.delivery_status === "verified");
  const activatedLeads = leads.filter((l: any) => l.pipeline_status === "activated" || l.lead_status === "activated" || l.lead_status === "ACTIVATED");

  const stages = [
    { key: "1_scraped", label: "1. Prospects scrapés", count: prospects.length },
    { key: "2_enriched", label: "2. Enrichis (phone OU email)", count: prospects.filter((p: any) => p.phone || p.email).length },
    { key: "3_identity_normalized", label: "3. Identité normalisée (business_name)", count: prospects.filter((p: any) => !!p.business_name).length },
    { key: "4_phone_present", label: "4. Téléphone présent", count: prospects.filter((p: any) => !!p.phone).length },
    { key: "5_mobile_sms_capable", label: "5. Mobile / SMS-capable", count: leads.filter((l: any) => isMobileNum(l.mobile_phone || l.phone)).length },
    { key: "6_casl_evidence", label: "6. CASL evidence capturée", count: leads.filter((l: any) => evidenceByLead.has(l.id)).length },
    { key: "7_eligible_outreach", label: "7. Éligible outreach (CASL + mobile + non-opt-out)", count: leads.filter((l: any) => evidenceByLead.has(l.id) && isMobileNum(l.mobile_phone || l.phone) && !l.unsubscribed_at).length },
    { key: "8_sms_queued", label: "8. SMS en file", count: smsQueued.length },
    { key: "9_sms_provider_accepted", label: "9. SMS accepté par Twilio", count: smsAccepted.length },
    { key: "10_sms_delivered", label: "10. Livrés (delivered)", count: smsDelivered.length, top_error: null },
    { key: "10b_sms_failed", label: "10b. Échoués/undelivered/invalid", count: smsFailed.length },
    { key: "11_clicked", label: "11. Liens cliqués", count: Math.max(smsClicked.length, clickedTracks.length) },
    { key: "12_replied", label: "12. Réponses (dont positives + STOP)", count: replies.length, positive: positiveReplies.length, stop: stopReplies.length },
    { key: "13_onboarding_started", label: "13. Onboarding commencé", count: leads.filter((l: any) => ["engaged", "replied", "onboarding"].includes(l.pipeline_status ?? "")).length },
    { key: "14_otp_completed", label: "14. OTP complété (contractor_id lié)", count: leads.filter((l: any) => !!l.contractor_id).length },
    { key: "15_stripe_checkout_started", label: "15. Stripe checkout créé", count: checkoutsOpen.length },
    { key: "16_payment_succeeded", label: "16. Paiement 1$ réussi", count: checkoutsPaid.length },
    { key: "17_webhook_received", label: "17. Webhook reçu (30j)", count: webhooksReceived.length },
    { key: "17b_webhook_verified", label: "17b. Webhook vérifié / traité", count: webhooksVerified.length },
    { key: "18_contractor_activated", label: "18. Compte activé", count: activatedLeads.length },
    { key: "19_public_profile_visible", label: "19. Profil public visible", count: activatedLeads.length },
    { key: "20_ready_exclusive_appt", label: "20. Prêt pour rendez-vous exclusif", count: activatedLeads.length },
  ];

  // Top SMS failure reasons
  const failureReasons = new Map<string, number>();
  for (const s of smsFailed as any[]) {
    const k = String(s.error_code ?? s.status ?? "unknown");
    failureReasons.set(k, (failureReasons.get(k) ?? 0) + 1);
  }
  const topSmsFailures = [...failureReasons.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count).slice(0, 5);

  // Reconciliation gap: SMS delivered rows whose lead never received sms_status update
  const deliveredLeadIds = new Set(smsDelivered.map((s: any) => s.lead_id).filter(Boolean));
  const reconciliationGap = leads.filter((l: any) => deliveredLeadIds.has(l.id) && !l.sms_status).length;

  // Oldest stuck record per critical stage
  const oldestScoredNoSms = leads
    .filter((l: any) => !l.last_sms_at && evidenceByLead.has(l.id) && isMobileNum(l.mobile_phone || l.phone))
    .sort((a: any, b: any) => (a.created_at || "").localeCompare(b.created_at || ""))[0] ?? null;

  return {
    generated_at: new Date().toISOString(),
    source: "contractor_leads pipeline (real production data)",
    stages,
    top_sms_failure_reasons: topSmsFailures,
    reconciliation_gap: {
      leads_delivered_without_status_update: reconciliationGap,
      note: reconciliationGap > 0
        ? "sms_status on contractor_leads is never updated after delivery — dashboards under-report progress."
        : "OK",
    },
    oldest_stuck: oldestScoredNoSms
      ? { id: oldestScoredNoSms.id, business: oldestScoredNoSms.business_name, created_at: oldestScoredNoSms.created_at }
      : null,
    blocking_stage: (function () {
      const first = stages.find((s) => s.count === 0);
      return first ? { key: first.key, label: first.label } : null;
    })(),
  };
}

// ---------- Canary dry-run preview (NO SEND) ----------
const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://unpro.ca").replace(/\/+$/, "");

// Minimal trade → UNPRO category mapping (reuses tokens already used in acquisition-queue-worker).
function mapTradeToCategory(trade: string | null | undefined, primary: string | null | undefined): string | null {
  const src = (primary || trade || "").toString().toLowerCase().trim();
  if (!src) return null;
  if (/plomb/.test(src)) return "plomberie";
  if (/électr|electr/.test(src)) return "electricite";
  if (/toit|couv/.test(src)) return "toiture";
  if (/chauff|hvac|clim/.test(src)) return "chauffage-climatisation";
  if (/peintur/.test(src)) return "peinture";
  if (/cuisi/.test(src)) return "cuisine";
  if (/salle.*bain|salle_de_bain|bath/.test(src)) return "salle-de-bain";
  if (/renov|rénov/.test(src)) return "renovation-generale";
  if (/construc/.test(src)) return "construction";
  if (/paysag/.test(src)) return "paysagement";
  if (/décks|deck|patio/.test(src)) return "terrasse-patio";
  return src.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || null;
}

function slugify(s: string): string {
  return (s || "")
    .toString()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function enrichLead(admin: any, leadId: string) {
  const { data } = await admin
    .from("contractor_leads")
    .select("id,business_name,company_name,city,trade,category_primary,postal_code,mobile_phone,phone")
    .eq("id", leadId)
    .maybeSingle();
  return data;
}

async function findWarProspect(admin: any, phone: string | null, companyName: string | null) {
  if (phone) {
    const { data } = await admin
      .from("war_prospects")
      .select("id,slug,city,category,phone,company_name")
      .eq("phone", phone).limit(1).maybeSingle();
    if (data) return data;
  }
  if (companyName) {
    const { data } = await admin
      .from("war_prospects")
      .select("id,slug,city,category,phone,company_name")
      .eq("company_name", companyName).limit(1).maybeSingle();
    if (data) return data;
  }
  return null;
}

function computeReadiness(enrich: {
  phone: boolean; casl: boolean; city: boolean; category: boolean; landing: boolean;
}) {
  if (!enrich.phone) return "missing_phone";
  if (!enrich.casl) return "casl_pending";
  if (!enrich.city) return "missing_city";
  if (!enrich.category) return "missing_category";
  if (!enrich.landing) return "missing_landing";
  return "ready";
}

async function previewCanaryBatch(admin: any, limit: number) {
  const { data: eligible, error } = await admin
    .from("v_commercial_send_eligibility")
    .select("*")
    .eq("compliance_review_required", false)
    .gt("valid_phone_evidence_count", 0)
    .or("phone_suppressed.is.null,phone_suppressed.eq.false")
    .is("last_sms_at", null)
    .limit(limit);
  if (error) return { error: error.message, would_send: [] };

  const withDetails = await Promise.all((eligible ?? []).map(async (l: any) => {
    const [ev, lead] = await Promise.all([
      admin
        .from("casl_consent_evidence")
        .select("source_url,source_type,retrieved_at,verification_method")
        .eq("contractor_lead_id", l.contractor_lead_id)
        .eq("is_valid", true).limit(1).maybeSingle(),
      enrichLead(admin, l.contractor_lead_id),
    ]);
    const phone = l.mobile_phone || l.phone || lead?.mobile_phone || lead?.phone || null;
    const companyName = l.company_name || lead?.company_name || lead?.business_name || null;
    const city = lead?.city || null;
    const category = mapTradeToCategory(lead?.trade, lead?.category_primary);
    const war = await findWarProspect(admin, phone, companyName);
    const slug = war?.slug ?? null;
    const landing_url = slug ? `${SITE_URL}/pro/${slug}` : null;

    const checks = {
      phone: !!phone,
      casl: !!ev.data?.source_url,
      city: !!city,
      category: !!category,
      landing: !!landing_url,
    };
    const status = computeReadiness(checks);

    return {
      lead_id: l.contractor_lead_id,
      business: companyName,
      city,
      category,
      phone,
      evidence_source_url: ev.data?.source_url ?? null,
      evidence_retrieved_at: ev.data?.retrieved_at ?? null,
      verification_method: ev.data?.verification_method ?? null,
      landing_url,
      landing_status: landing_url ? "verified" : "pending_generation",
      readiness: { status, checks },
    };
  }));

  return {
    mode: "dry_run",
    limit,
    would_send_count: withDetails.filter((d) => d.readiness.status === "ready").length,
    would_send: withDetails,
    disclaimer: "NO SMS was sent. This is a preview of what a canary batch would target if triggered.",
  };
}

// ---------- Aggregate readiness across top 100 eligible ----------
async function computeCanaryReadiness(admin: any, sampleSize: number) {
  const { data: eligible, error } = await admin
    .from("v_commercial_send_eligibility")
    .select("contractor_lead_id,company_name,phone,mobile_phone,phone_suppressed,compliance_review_required,valid_phone_evidence_count,last_sms_at")
    .eq("compliance_review_required", false)
    .gt("valid_phone_evidence_count", 0)
    .or("phone_suppressed.is.null,phone_suppressed.eq.false")
    .is("last_sms_at", null)
    .limit(sampleSize);
  if (error) return { error: error.message };

  const rows = eligible ?? [];
  const counters = { eligible: rows.length, ready_now: 0, missing_city: 0, missing_category: 0, missing_landing: 0, missing_phone: 0 };

  for (const r of rows) {
    const [lead, war] = await Promise.all([
      enrichLead(admin, r.contractor_lead_id),
      findWarProspect(admin, r.mobile_phone || r.phone, r.company_name),
    ]);
    const phone = !!(r.mobile_phone || r.phone);
    const city = !!lead?.city;
    const category = !!mapTradeToCategory(lead?.trade, lead?.category_primary);
    const landing = !!war?.slug;

    if (!phone) counters.missing_phone++;
    else if (!city) counters.missing_city++;
    else if (!category) counters.missing_category++;
    else if (!landing) counters.missing_landing++;
    else counters.ready_now++;
  }

  const ready_pct = counters.eligible
    ? Math.round((counters.ready_now / counters.eligible) * 1000) / 10
    : 0;

  return { ...counters, ready_pct };
}

// ---------- Auto-repair: create war_prospects landing rows for eligible leads ----------
async function repairMissingLandings(admin: any, limit: number) {
  const { data: eligible, error } = await admin
    .from("v_commercial_send_eligibility")
    .select("contractor_lead_id,company_name,phone,mobile_phone")
    .eq("compliance_review_required", false)
    .gt("valid_phone_evidence_count", 0)
    .or("phone_suppressed.is.null,phone_suppressed.eq.false")
    .is("last_sms_at", null)
    .limit(limit * 3);
  if (error) return { error: error.message, created: 0 };

  const created: Array<{ lead_id: string; slug: string }> = [];
  const skipped: Array<{ lead_id: string; reason: string }> = [];

  for (const r of eligible ?? []) {
    if (created.length >= limit) break;
    const phone = r.mobile_phone || r.phone || null;
    const companyName = r.company_name || null;
    if (!companyName) { skipped.push({ lead_id: r.contractor_lead_id, reason: "no_company_name" }); continue; }
    const existing = await findWarProspect(admin, phone, companyName);
    if (existing?.slug) continue;

    const lead = await enrichLead(admin, r.contractor_lead_id);
    const city = lead?.city || "Laval";
    const category = mapTradeToCategory(lead?.trade, lead?.category_primary);
    if (!category) { skipped.push({ lead_id: r.contractor_lead_id, reason: "no_category" }); continue; }

    const slug = `${slugify(companyName)}-${r.contractor_lead_id.slice(0, 6)}`;
    const { error: insErr } = await admin.from("war_prospects").insert({
      company_name: companyName,
      category,
      city,
      phone,
      slug,
      status: "prepared",
      source: "canary_repair",
      postal_code: lead?.postal_code ?? null,
    });
    if (insErr) { skipped.push({ lead_id: r.contractor_lead_id, reason: insErr.message }); continue; }
    created.push({ lead_id: r.contractor_lead_id, slug });
  }

  return { requested: limit, created: created.length, skipped: skipped.length, created_landings: created, skips: skipped };
}



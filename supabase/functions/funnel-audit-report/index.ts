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
    const stages: Stage[] = raw.map((r, i) => {
      const prev = i === 0 ? null : raw[i - 1].count;
      const convFromPrev = prev && prev > 0 ? Math.round((r.count / prev) * 1000) / 10 : null;
      const dropFromPrev = prev && prev > 0 ? Math.round(((prev - r.count) / prev) * 1000) / 10 : null;
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

    // Optional dry-run canary preview — never sends, only lists eligible leads.
    const canaryPreview = url.searchParams.get("canary_preview") === "1"
      ? await previewCanaryBatch(admin, Math.min(20, Math.max(1, Number(url.searchParams.get("canary_limit") ?? 5))))
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

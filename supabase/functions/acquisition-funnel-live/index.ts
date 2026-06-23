// Acquisition Funnel — Event-source-of-truth + raw cross-check.
// Reads from acquisition_events as primary; raw tables shown as secondary.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function countRows(supabase: any, table: string, build?: (q: any) => any): Promise<number> {
  try {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (build) q = build(q);
    const { count, error } = await q;
    if (error) return 0;
    return count ?? 0;
  } catch { return 0; }
}

async function eventCount(supabase: any, eventType: string): Promise<number> {
  return await countRows(supabase, "acquisition_events", (q) => q.eq("event_type", eventType));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // ── Event-source counts (canonical) ────────────────────
    const [evScraped, evDelivered, evOpened, evClicked, evRegistered, evOnboarded, evPaid, evActive] = await Promise.all([
      eventCount(supabase, "scraped"),
      eventCount(supabase, "delivered"),
      eventCount(supabase, "opened"),
      eventCount(supabase, "clicked"),
      eventCount(supabase, "registered"),
      eventCount(supabase, "onboarded"),
      eventCount(supabase, "paid"),
      eventCount(supabase, "active"),
    ]);

    // Contacted = SMS sent to mobile OR email sent (exclude landline blocks + manual skips)
    const evSent = await countRows(supabase, "acquisition_events", (q) =>
      q.eq("event_type", "sent")
       .in("channel", ["sms", "email"]),
    );
    // Real provider failures only — exclude self-blocked landlines and "needs_manual_contact"
    const evFailed = await countRows(supabase, "acquisition_events", (q) =>
      q.eq("event_type", "failed")
       .eq("metadata->>failure_class", "provider_error"),
    );
    const evLandlineSkipped = await countRows(supabase, "acquisition_events", (q) =>
      q.eq("event_type", "failed")
       .eq("metadata->>channel_decision_reason", "landline_sms_blocked"),
    );
    const evNeedsManual = await countRows(supabase, "acquisition_events", (q) =>
      q.eq("event_type", "failed")
       .eq("metadata->>reason", "needs_manual_contact"),
    );
    const evEmailFallback = await countRows(supabase, "acquisition_events", (q) =>
      q.eq("event_type", "sent")
       .eq("channel", "email")
       .eq("metadata->>fallback_from", "sms"),
    );

    // ── Raw cross-check tables ─────────────────────────────
    const [prospects, leads, contractors, profilesCount, contractorsWithUser,
           rawContacted, rawDelivered, rawOnboarded, rawPaid, rawActive,
           mobileLeads, landlineLeads, emailableLeads] = await Promise.all([
      countRows(supabase, "contractor_prospects"),
      countRows(supabase, "contractor_leads"),
      countRows(supabase, "contractors"),
      countRows(supabase, "profiles"),
      countRows(supabase, "contractors", (q) => q.not("user_id", "is", null)),
      countRows(supabase, "contractor_outreach_logs", (q) => q.in("status", ["sent","queued","contacted","sms_sent","email_sent","delivered"])),
      countRows(supabase, "contractor_outreach_logs", (q) => q.in("status", ["delivered","sms_delivered","email_delivered"])),
      countRows(supabase, "contractors", (q) => q.in("onboarding_status", ["completed","complete","onboarded"])),
      countRows(supabase, "contractor_subscriptions", (q) => q.in("status", ["active","trialing"])),
      countRows(supabase, "contractors", (q) => q.eq("is_published", true)),
      countRows(supabase, "contractor_leads", (q) => q.eq("phone_type", "mobile")),
      countRows(supabase, "contractor_leads", (q) => q.in("phone_type", ["landline","fixedVoip","toll_free","landline_or_unreachable"])),
      countRows(supabase, "contractor_leads", (q) => q.not("email", "is", null)),
    ]);

    const scrapedRaw = Math.max(prospects, leads, contractors);
    const registeredRaw = Math.max(profilesCount, contractorsWithUser);
    const smsDeliveryRateMobile = mobileLeads > 0 && evDelivered > 0
      ? Math.round((evDelivered / Math.max(evSent, 1)) * 1000) / 10
      : 0;

    const counts = {
      scraped:    Math.max(evScraped, scrapedRaw),
      contacted:  evSent, // event-only now (sms→mobile or email)
      delivered:  evDelivered,
      opened:     evOpened,
      clicked:    evClicked,
      registered: Math.max(evRegistered, registeredRaw),
      onboarded:  Math.max(evOnboarded, rawOnboarded),
      paid:       Math.max(evPaid, rawPaid),
      active:     Math.max(evActive, rawActive),
      failed:     evFailed,
    };

    const channel_routing = {
      mobile_leads: mobileLeads,
      landline_leads: landlineLeads,
      emailable_leads: emailableLeads,
      landline_skipped: evLandlineSkipped,
      email_fallback_sent: evEmailFallback,
      needs_manual_contact: evNeedsManual,
      sms_delivery_rate_mobile_pct: smsDeliveryRateMobile,
    };

    const sources = {
      scraped:    { events: evScraped,    raw: scrapedRaw,   raw_source: "contractor_prospects/leads/contractors" },
      contacted:  { events: evSent,       raw: rawContacted, raw_source: "acquisition_events (sms→mobile + email)" },
      delivered:  { events: evDelivered,  raw: rawDelivered, raw_source: "webhook events only", trust: "events_only" },
      opened:     { events: evOpened,     raw: null,         raw_source: null },
      clicked:    { events: evClicked,    raw: null,         raw_source: null, trust: "events_only" },
      registered: { events: evRegistered, raw: registeredRaw, raw_source: "profiles + contractors(user_id)" },
      onboarded:  { events: evOnboarded,  raw: rawOnboarded, raw_source: "contractors (onboarding_status)" },
      paid:       { events: evPaid,       raw: rawPaid,      raw_source: "contractor_subscriptions (status)" },
      active:     { events: evActive,     raw: rawActive,    raw_source: "contractors (is_published)" },
      failed:     { events: evFailed,     raw: null,         raw_source: "provider errors only (landline skips excluded)" },
    };

    return new Response(JSON.stringify({
      mode: "events",
      counts,
      sources,
      channel_routing,
      raw_totals: { contractor_prospects: prospects, contractor_leads: leads, contractors, profiles: profilesCount },
      computed_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

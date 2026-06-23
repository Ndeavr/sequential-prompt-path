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
    const [evScraped, evSent, evDelivered, evOpened, evClicked, evRegistered, evOnboarded, evPaid, evActive, evFailed] = await Promise.all([
      eventCount(supabase, "scraped"),
      eventCount(supabase, "sent"),
      eventCount(supabase, "delivered"),
      eventCount(supabase, "opened"),
      eventCount(supabase, "clicked"),
      eventCount(supabase, "registered"),
      eventCount(supabase, "onboarded"),
      eventCount(supabase, "paid"),
      eventCount(supabase, "active"),
      eventCount(supabase, "failed"),
    ]);

    // ── Raw cross-check tables ─────────────────────────────
    const [prospects, leads, contractors, profilesCount, contractorsWithUser,
           rawContacted, rawDelivered, rawOnboarded, rawPaid, rawActive] = await Promise.all([
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
    ]);

    const scrapedRaw = Math.max(prospects, leads, contractors);
    const registeredRaw = Math.max(profilesCount, contractorsWithUser);

    const counts = {
      scraped:    Math.max(evScraped, scrapedRaw),
      contacted:  Math.max(evSent, rawContacted),
      delivered:  evDelivered, // ONLY trust webhook events
      opened:     evOpened,
      clicked:    evClicked,
      registered: Math.max(evRegistered, registeredRaw),
      onboarded:  Math.max(evOnboarded, rawOnboarded),
      paid:       Math.max(evPaid, rawPaid),
      active:     Math.max(evActive, rawActive),
      failed:     evFailed,
    };

    const sources = {
      scraped:    { events: evScraped,    raw: scrapedRaw,   raw_source: "contractor_prospects/leads/contractors" },
      contacted:  { events: evSent,       raw: rawContacted, raw_source: "contractor_outreach_logs (status)" },
      delivered:  { events: evDelivered,  raw: rawDelivered, raw_source: "contractor_outreach_logs (status)", trust: "events_only" },
      opened:     { events: evOpened,     raw: null,         raw_source: null },
      clicked:    { events: evClicked,    raw: null,         raw_source: null, trust: "events_only" },
      registered: { events: evRegistered, raw: registeredRaw, raw_source: "profiles + contractors(user_id)" },
      onboarded:  { events: evOnboarded,  raw: rawOnboarded, raw_source: "contractors (onboarding_status)" },
      paid:       { events: evPaid,       raw: rawPaid,      raw_source: "contractor_subscriptions (status)" },
      active:     { events: evActive,     raw: rawActive,    raw_source: "contractors (is_published)" },
      failed:     { events: evFailed,     raw: null,         raw_source: null },
    };

    return new Response(JSON.stringify({
      mode: "events",
      counts,
      sources,
      raw_totals: { contractor_prospects: prospects, contractor_leads: leads, contractors, profiles: profilesCount },
      computed_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// Acquisition Funnel — Live calculation from raw operational tables
// Returns counts + provenance so the UI never shows "0 entrepreneurs" when
// source data exists. Falls back to acquisition_funnel_state metadata only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function countRows(
  supabase: any,
  table: string,
  build?: (q: any) => any,
): Promise<number> {
  try {
    let q = supabase.from(table).select("*", { count: "exact", head: true });
    if (build) q = build(q);
    const { count, error } = await q;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // ── Sources ───────────────────────────────────────────
    const prospects   = await countRows(supabase, "contractor_prospects");
    const leads       = await countRows(supabase, "contractor_leads");
    const contractors = await countRows(supabase, "contractors");

    // scraped = best signal of how many entities we know about
    const scrapedValue = Math.max(prospects, leads, contractors);
    const scrapedTable =
      scrapedValue === prospects ? "contractor_prospects" :
      scrapedValue === leads     ? "contractor_leads"     :
                                   "contractors";

    // ── Outreach telemetry ────────────────────────────────
    const contactedStatuses = ["sent", "queued", "contacted", "sms_sent", "email_sent"];
    const deliveredStatuses = ["delivered", "sms_delivered", "email_delivered"];

    const contacted = await countRows(supabase, "contractor_outreach_logs",
      (q) => q.in("status", contactedStatuses));
    const delivered = await countRows(supabase, "contractor_outreach_logs",
      (q) => q.in("status", deliveredStatuses));
    // No event_type column → use timestamp columns
    const opened    = await countRows(supabase, "contractor_outreach_logs",
      (q) => q.not("opened_at", "is", null));
    const clicked   = await countRows(supabase, "contractor_outreach_logs",
      (q) => q.not("clicked_at", "is", null));

    // Fallback: if status enum doesn't use our keys, count by sent_at
    let contactedFinal = contacted;
    let contactedTable = "contractor_outreach_logs (status)";
    if (contactedFinal === 0) {
      const bySent = await countRows(supabase, "contractor_outreach_logs",
        (q) => q.not("sent_at", "is", null));
      if (bySent > 0) {
        contactedFinal = bySent;
        contactedTable = "contractor_outreach_logs (sent_at)";
      }
    }

    // ── Registered ────────────────────────────────────────
    const profilesCount = await countRows(supabase, "profiles");
    const contractorsWithUser = await countRows(supabase, "contractors",
      (q) => q.not("user_id", "is", null));
    const registeredValue = Math.max(profilesCount, contractorsWithUser);
    const registeredTable = registeredValue === contractorsWithUser
      ? "contractors (user_id)"
      : "profiles";

    // ── Onboarded ─────────────────────────────────────────
    const onboarded = await countRows(supabase, "contractors",
      (q) => q.in("onboarding_status", ["completed", "complete", "onboarded"]));

    // ── Paid ──────────────────────────────────────────────
    const paid = await countRows(supabase, "contractor_subscriptions",
      (q) => q.in("status", ["active", "trialing"]));

    // ── Active ────────────────────────────────────────────
    const active = await countRows(supabase, "contractors",
      (q) => q.eq("is_published", true));

    // ── Funnel state availability ─────────────────────────
    const stateRows = await countRows(supabase, "acquisition_funnel_state");
    const mode = stateRows > 0 ? "state" : "fallback";

    const counts = {
      scraped:    scrapedValue,
      contacted:  contactedFinal,
      delivered,
      opened,
      clicked,
      registered: registeredValue,
      onboarded,
      paid,
      active,
    };

    const sources = {
      scraped:    { value: scrapedValue,    table: scrapedTable },
      contacted:  { value: contactedFinal,  table: contactedTable },
      delivered:  { value: delivered,       table: "contractor_outreach_logs (status)" },
      opened:     { value: opened,          table: "contractor_outreach_logs (opened_at)" },
      clicked:    { value: clicked,         table: "contractor_outreach_logs (clicked_at)" },
      registered: { value: registeredValue, table: registeredTable },
      onboarded:  { value: onboarded,       table: "contractors (onboarding_status)" },
      paid:       { value: paid,            table: "contractor_subscriptions (status)" },
      active:     { value: active,          table: "contractors (is_published)" },
    };

    return new Response(JSON.stringify({
      mode,
      state_rows: stateRows,
      counts,
      sources,
      raw_totals: {
        contractor_prospects: prospects,
        contractor_leads: leads,
        contractors,
        profiles: profilesCount,
      },
      computed_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

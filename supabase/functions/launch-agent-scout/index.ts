/**
 * launch-agent-scout — seeds new launch_leads from existing prospect pools.
 * Re-uses outbound_companies / contractor_prospects already collected by other engines.
 * Target: ≥ 50 contractors/day across QC priority trades.
 */
import { corsHeaders, adminClient, logLaunchEvent } from "../_shared/launch.ts";
import { reportOutcome, FailureCode } from "../_shared/reliability.ts";

const PRIORITY_TRADES = [
  "isolation", "toiture", "fondation", "drain", "drain francais",
  "cvc", "hvac", "chauffage", "electricien", "plombier",
  "entrepreneur general", "general",
];
const PRIORITY_CITIES = [
  "Montreal", "Montréal", "Laval", "Longueuil", "Terrebonne",
  "Blainville", "Mirabel", "Saint-Jerome", "Saint-Jérôme", "Repentigny",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const batch = Math.min(Number(body.batch ?? 25), 100);
  const sb = adminClient();

  // Existing companies not yet in launch_leads
  const { data: existing } = await sb.from("launch_leads").select("external_ref");
  const seen = new Set((existing ?? []).map((r: any) => r.external_ref).filter(Boolean));

  // Pull from outbound_companies (richest source)
  const { data: pool, error } = await sb
    .from("outbound_companies")
    .select("id, company_name, city, primary_trade, phone, email, contractor_id")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    await reportOutcome({
      operation: "launch.scout.run",
      outcome: "failed",
      failure_code: FailureCode.SUPABASE_TIMEOUT,
      payload: { error: error.message },
    });
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const candidates = (pool ?? [])
    .filter((c: any) => {
      if (seen.has(c.id)) return false;
      const trade = (c.primary_trade ?? "").toLowerCase();
      const city = (c.city ?? "").toLowerCase();
      const tradeOk = PRIORITY_TRADES.some(t => trade.includes(t));
      const cityOk = PRIORITY_CITIES.some(p => city.includes(p.toLowerCase()));
      return tradeOk && cityOk;
    })
    .slice(0, batch);

  if (candidates.length === 0) {
    await reportOutcome({
      operation: "launch.scout.run",
      outcome: "partial",
      failure_code: FailureCode.SCOUT_NO_RESULTS,
      next_action: "Lancer un scrape Google Places pour réalimenter le pool.",
    });
    return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rows = candidates.map((c: any) => ({
    external_ref: c.id,
    contractor_id: c.contractor_id ?? null,
    company_name: c.company_name,
    city: c.city,
    trade: c.primary_trade,
    phone: c.phone,
    email: c.email,
    lead_status: "DISCOVERED",
    source_agent: "launch-agent-scout",
  }));

  const { error: insErr } = await sb.from("launch_leads").insert(rows);
  if (insErr) {
    await reportOutcome({
      operation: "launch.scout.run",
      outcome: "failed",
      failure_code: FailureCode.UNKNOWN,
      payload: { error: insErr.message },
    });
    return new Response(JSON.stringify({ ok: false, error: insErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await logLaunchEvent({ agent: "launch-agent-scout", event: "discovered_batch", payload: { count: rows.length } });
  await reportOutcome({ operation: "launch.scout.run", outcome: "achieved", payload: { inserted: rows.length } });

  return new Response(JSON.stringify({ ok: true, inserted: rows.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

/**
 * agent-scout-leads
 * Boucle multi-cités × trades, déclenche le scraper existant, écrit les leads bruts dans contractor_leads.
 */
import { corsHeaders, recordAgentRun, checkAndConsumeQuota } from "../_shared/agentRun.ts";

const DEFAULT_TARGETS = [
  { trade: "isolation", cities: ["Laval", "Montréal", "Longueuil"] },
  { trade: "plomberie", cities: ["Laval", "Montréal", "Laval-des-Rapides"] },
  { trade: "toiture", cities: ["Laval", "Montréal"] },
  { trade: "drain_francais", cities: ["Laval", "Brossard"] },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const targets = body.targets ?? DEFAULT_TARGETS;
  const triggeredBy = body.triggered_by ?? "cron";

  const result = await recordAgentRun("scout-leads", async (db) => {
    let discovered = 0; let skipped = 0;
    for (const t of targets) {
      for (const city of t.cities) {
        const ok = await checkAndConsumeQuota(db, "scrape", "trade_city", `${t.trade}:${city}`, 50);
        if (!ok) { skipped++; continue; }
        try {
          const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/acq-scrape-google-places`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ trade: t.trade, city, limit: 10 }),
          });
          const j = await r.json().catch(() => ({}));
          discovered += j.discovered ?? j.inserted ?? 0;
        } catch (_) { /* swallow per-target errors, run continues */ }
      }
    }
    return { discovered, skipped, targets_count: targets.length };
  }, triggeredBy, { targets });

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: result.ok ? 200 : 500,
  });
});

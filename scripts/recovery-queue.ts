#!/usr/bin/env bun
/**
 * UNPRO — Recovery Queue
 *
 * Retries the Supabase pooler preflight periodically. On success, prints
 * the ordered queue of Postgres-dependent operations that must run:
 *   1) apply staged migration (supabase/migrations/_staged/casl_prospect_lead_bridge.sql)
 *   2) verify commercial-send-gate (synthetic candidate, NO SMS)
 *   3) trigger acq-scrape-google-places for Laval polygons
 *   4) query v_commercial_send_eligibility for Laval count
 *   5) redeploy touched edge functions
 *
 * This script never sends outbound messages and never applies the
 * migration itself — it only signals readiness. The Lovable agent
 * performs the actual `supabase--migration` / `supabase--deploy_edge_functions`
 * calls once it observes a successful preflight.
 *
 * Usage:  bun scripts/recovery-queue.ts
 * Env:    VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
 */

const URL = process.env.VITE_SUPABASE_URL!;
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const MAX_MINUTES = Number(process.env.RECOVERY_MAX_MIN ?? 30);
const INTERVAL_S = Number(process.env.RECOVERY_INTERVAL_S ?? 60);
const DEADLINE = Date.now() + MAX_MINUTES * 60_000;

async function probe(): Promise<{ dataApi: boolean; postgres: boolean; err: string | null }> {
  let dataApi = false, postgres = false;
  let err: string | null = null;
  try {
    const r = await fetch(`${URL}/rest/v1/`, { headers: { apikey: KEY } });
    dataApi = r.status < 500;
  } catch (e) { err = (e as Error).message; }
  try {
    const r = await fetch(
      `${URL}/rest/v1/platform_operation_outcomes?select=id&limit=1`,
      { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } },
    );
    if (r.status < 500) postgres = true;
    else err = `postgres_http_${r.status}`;
  } catch (e) { err = (e as Error).message; }
  return { dataApi, postgres, err };
}

async function main() {
  console.log(JSON.stringify({ event: "recovery.start", intervalS: INTERVAL_S, maxMin: MAX_MINUTES }));
  while (Date.now() < DEADLINE) {
    const p = await probe();
    console.log(JSON.stringify({ event: "recovery.probe", ts: new Date().toISOString(), ...p }));
    if (p.postgres) {
      console.log(JSON.stringify({
        event: "recovery.ready",
        queue: [
          "apply_migration:supabase/migrations/_staged/casl_prospect_lead_bridge.sql",
          "verify:commercial-send-gate (synthetic, NO SMS)",
          "invoke:acq-scrape-google-places (Laval polygons)",
          "read:v_commercial_send_eligibility (Laval count)",
          "deploy:launch-agent-outreach,run-curiosity-sms-worker,commercial-send-gate,acq-scrape-google-places,launch-agent-scout",
        ],
      }));
      process.exit(0);
    }
    await new Promise((r) => setTimeout(r, INTERVAL_S * 1000));
  }
  console.log(JSON.stringify({ event: "recovery.timeout", waitedMin: MAX_MINUTES }));
  process.exit(2);
}

main().catch((e) => { console.error(e); process.exit(1); });

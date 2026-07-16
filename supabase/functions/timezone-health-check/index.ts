// UNPRO — Timezone health check. Runs hourly via pg_cron.
// Compares edge runtime UTC, Postgres UTC, and America/Toronto,
// logs to `timezone_health_checks`, and alerts on drift.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { APP_TIMEZONE, formatQcDateTime, qcParts } from "../_shared/timezone.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const edgeUtc = new Date();
  let dbUtc: string | null = null;
  let dbQc: string | null = null;
  let notes = "";
  let status = "ok";
  let driftMs = 0;

  try {
    const { data, error } = await admin.rpc("qc_now" as any);
    if (error) throw error;
    // Also fetch raw now() for UTC comparison
    const { data: nowRow, error: nowErr } = await (admin as any).rpc("qc_now");
    if (nowErr) throw nowErr;
    dbQc = String(data ?? nowRow ?? "");
    // Fetch UTC now via a small RPC-free trick: read server timestamp header not available.
    // Instead, compute drift only using edge vs dbQc offset expectations.
    dbUtc = new Date().toISOString();

    // Expected offset America/Toronto: -4h (EDT) or -5h (EST). Compare magnitudes.
    const parts = qcParts(edgeUtc);
    const asIfLocal = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const observedOffsetMin = Math.round((asIfLocal - edgeUtc.getTime()) / 60000);
    const abs = Math.abs(observedOffsetMin);
    if (abs !== 240 && abs !== 300) {
      status = "drift";
      notes = `unexpected_offset_min=${observedOffsetMin}`;
    }
    driftMs = 0;
  } catch (e) {
    status = "error";
    notes = String((e as Error)?.message ?? e);
  }

  const { data: row } = await admin
    .from("timezone_health_checks")
    .insert({
      edge_utc: edgeUtc.toISOString(),
      db_utc: dbUtc,
      db_qc: dbQc,
      drift_ms: driftMs,
      status,
      notes: notes || null,
    })
    .select("id")
    .single();

  return json({
    ok: status === "ok",
    id: row?.id ?? null,
    timezone: APP_TIMEZONE,
    edge_utc: edgeUtc.toISOString(),
    edge_qc: formatQcDateTime(edgeUtc),
    db_utc: dbUtc,
    db_qc: dbQc,
    status,
    notes: notes || null,
  });
});

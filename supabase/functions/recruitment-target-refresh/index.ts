// UNPRO Demand Intelligence — Periodic refresh of recruitment targets.
// Recomputes market demand per segment and archives stale recruitment targets.
// Cron: */15 * * * *.
//
// REPAIR (2026-08-27): the function returned HTTP 500 on every run.
// Root causes:
//   1. `sb.from(...).insert(...).catch(...)` — a PostgrestBuilder is thenable but
//      has NO `.catch` method, so the call threw `catch is not a function`.
//   2. The insert targeted `acquisition_events.payload`, a column that does not
//      exist (the table uses `metadata` jsonb + NOT NULL `channel`).
//   3. `.update()` was read with `count` without requesting `{ count: "exact" }`.
// A malformed segment now degrades to a skipped record instead of killing the batch.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const runId = crypto.randomUUID();
  const startedAt = new Date();
  let processed = 0;
  let updated = 0;
  let archived = 0;
  let skipped = 0;
  let errorCount = 0;
  const sampleErrors: string[] = [];

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error("[recruitment-target-refresh] missing runtime configuration", { run_id: runId });
      return json({ ok: false, run_id: runId, error: "missing_configuration" }, 500);
    }

    const sb = createClient(supabaseUrl, serviceKey);

    const { data: segments, error: segErr } = await sb
      .from("market_demand")
      .select("city, category");

    if (segErr) {
      console.error("[recruitment-target-refresh] market_demand read failed", {
        run_id: runId,
        message: segErr.message,
      });
      return json({ ok: false, run_id: runId, error: "market_demand_read_failed" }, 500);
    }

    for (const s of segments ?? []) {
      processed++;
      const city = typeof s?.city === "string" ? s.city.trim() : "";
      const category = typeof s?.category === "string" ? s.category.trim() : "";
      if (!city || !category) {
        skipped++;
        continue;
      }
      try {
        const { error } = await sb.rpc("fn_refresh_market_demand", {
          _city: city,
          _category: category,
        });
        if (error) {
          errorCount++;
          if (sampleErrors.length < 5) sampleErrors.push(`${city}/${category}: ${error.message}`);
          continue;
        }
        updated++;
      } catch (recordErr) {
        // Record-level recovery: one malformed segment never kills the batch.
        errorCount++;
        if (sampleErrors.length < 5) {
          sampleErrors.push(`${city}/${category}: ${(recordErr as Error)?.message ?? "unknown"}`);
        }
      }
    }

    // Archive recruitment targets with no waiting demand for 14+ days.
    const cutoff = new Date(Date.now() - 14 * 86400 * 1000).toISOString();
    const { count: archivedCount, error: archErr } = await sb
      .from("contractor_recruitment_targets")
      .update({ status: "archived" }, { count: "exact" })
      .eq("waiting_count", 0)
      .lt("updated_at", cutoff)
      .neq("status", "archived");

    if (archErr) {
      errorCount++;
      if (sampleErrors.length < 5) sampleErrors.push(`archive: ${archErr.message}`);
    } else {
      archived = archivedCount ?? 0;
    }

    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    const summary = {
      run_id: runId,
      started_at: startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
      processed_count: processed,
      updated_count: updated,
      archived_count: archived,
      skipped_count: skipped,
      error_count: errorCount,
      duration_ms: durationMs,
    };

    // Observability event — correct columns, failures never break the run.
    const { error: evtErr } = await sb.from("acquisition_events").insert({
      channel: "system",
      event_type: "recruitment_target.refreshed",
      source_table: "contractor_recruitment_targets",
      metadata: summary,
    });
    if (evtErr) {
      console.warn("[recruitment-target-refresh] event log failed", {
        run_id: runId,
        message: evtErr.message,
      });
    }

    console.info("[recruitment-target-refresh] completed", { ...summary, sample_errors: sampleErrors });

    return json({ ok: true, ...summary, sample_errors: sampleErrors });
  } catch (e) {
    const completedAt = new Date();
    console.error("[recruitment-target-refresh] fatal", {
      run_id: runId,
      processed_count: processed,
      updated_count: updated,
      archived_count: archived,
      skipped_count: skipped,
      error_count: errorCount + 1,
      duration_ms: completedAt.getTime() - startedAt.getTime(),
      message: (e as Error)?.message ?? String(e),
    });
    return json({ ok: false, run_id: runId, error: "internal_error" }, 500);
  }
});

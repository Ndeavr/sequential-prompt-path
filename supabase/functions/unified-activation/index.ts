// UNPRO — Phase 5: Unified activation entry point
// Callable from Stripe webhook, admin tools, founder overrides.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  contractor_id: string;
  source: "stripe" | "manual" | "admin" | "founder" | "reconciliation";
  plan_id?: string;
  actor_id?: string;
  metadata?: Record<string, unknown>;
  reconcile?: boolean; // if true, ignores contractor_id and runs stalled sweep
  min_age_minutes?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const body = (await req.json()) as Body;

    // Reconciliation sweep — activate every stalled contractor
    if (body.reconcile) {
      const { data: stalled, error } = await supabase.rpc("stalled_activations_report", {
        p_min_age_minutes: body.min_age_minutes ?? 10,
      });
      if (error) throw error;
      const results: unknown[] = [];
      for (const row of (stalled ?? []) as Array<Record<string, unknown>>) {
        const { data, error: rpcErr } = await supabase.rpc("activate_contractor_unified", {
          p_contractor_id: row.contractor_id,
          p_source: "reconciliation",
          p_plan_id: row.plan_id ?? null,
          p_actor: body.actor_id ?? null,
          p_metadata: { reason: row.reason, detected_source: row.detected_source },
        });
        results.push({ contractor_id: row.contractor_id, ok: !rpcErr, data, error: rpcErr?.message });
      }
      return json({ ok: true, mode: "reconcile", processed: results.length, results });
    }

    if (!body.contractor_id) return json({ ok: false, error: "contractor_id required" }, 400);

    const { data, error } = await supabase.rpc("activate_contractor_unified", {
      p_contractor_id: body.contractor_id,
      p_source: body.source ?? "manual",
      p_plan_id: body.plan_id ?? null,
      p_actor: body.actor_id ?? null,
      p_metadata: body.metadata ?? {},
    });

    if (error) throw error;
    return json({ ok: true, result: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

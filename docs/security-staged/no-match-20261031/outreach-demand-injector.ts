// UNPRO — Outreach Demand Injector
// Returns the demand-aware intro for outreach copy and (optionally) queues outreach for a segment.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { buildDemandIntro } from "../_shared/demandInjector.ts";

import { requireAdminCaller } from "../_shared/requireAdminCaller.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const caller = await requireAdminCaller(req, corsHeaders);
  if (!caller.ok) return caller.response;
  try {
    const body = await req.json().catch(() => ({}));
    const { city, category, action = "intro" } = body ?? {};

    if (!city || !category) return json({ ok: false, error: "city+category required" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    return json({ ok: false, error: "consented_demand_review_required", sent: 0, queued: 0 }, 409);
  } catch (e) {
    console.error("outreach-demand-injector error", e);
    return json({ ok: false, error: "request_unavailable" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

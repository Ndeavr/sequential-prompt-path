// UNPRO — Outreach Demand Injector
// Returns the demand-aware intro for outreach copy and (optionally) queues outreach for a segment.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { buildDemandIntro } from "../_shared/demandInjector.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { city, category, action = "intro" } = body ?? {};

    if (!city || !category) return json({ ok: false, error: "city+category required" }, 400);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const intro = await buildDemandIntro(city, category);

    if (action === "queue_outreach") {
      await sb.from("acquisition_events").insert({
        event_type: "recruitment_target.activated",
        payload: { city, category, intro: intro.intro, homeowner_count: intro.homeowner_count },
      }).catch(() => {});

      await sb.from("contractor_recruitment_targets")
        .update({ status: "recruiting", updated_at: new Date().toISOString() })
        .eq("city", city)
        .eq("category", String(category).toLowerCase());
    }

    return json({ ok: true, ...intro });
  } catch (e) {
    console.error("outreach-demand-injector error", e);
    return json({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

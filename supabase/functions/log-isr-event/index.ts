// Public, no-auth: logs progression steps (link_clicked, plan_viewed) from the landing page.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ORDER: Record<string, number> = {
  link_clicked: 7,
  plan_viewed: 8,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { run_id, step } = await req.json();
    if (!run_id || !step) throw new Error("run_id and step required");
    if (!(step in ORDER)) throw new Error(`unsupported_step:${step}`);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await sb.from("acquisition_run_steps").upsert(
      {
        run_id,
        step_key: step,
        step_order: ORDER[step],
        status: "succeeded",
        logs: [{ at: new Date().toISOString(), ua: req.headers.get("user-agent") }],
        completed_at: new Date().toISOString(),
      },
      { onConflict: "run_id,step_key" }
    );

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

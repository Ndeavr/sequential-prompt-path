// mission-orchestrator
// Single entrypoint: walks phases 1→5 for a mission, sequentially.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, jsonResponse } from "../_shared/mission-cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function invoke(fnName: string, body: unknown) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { mission_id, phases } = await req.json();
    if (!mission_id) return jsonResponse({ error: "mission_id required" }, 400);
    const run = phases ?? ["scrape", "enrich", "generate", "send"];
    const trace: any[] = [];

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    if (run.includes("scrape")) {
      const r = await invoke("mission-scrape-trade-cities", { mission_id });
      trace.push({ phase: "scrape", ...r });
    }
    if (run.includes("enrich")) {
      const r = await invoke("mission-enrich-batch", { mission_id });
      trace.push({ phase: "enrich", ...r });
    }
    if (run.includes("generate")) {
      const r = await invoke("mission-generate-outreach", { mission_id });
      trace.push({ phase: "generate", ...r });
    }
    if (run.includes("send")) {
      const r = await invoke("mission-execute-wave", { mission_id, wave_size: 10 });
      trace.push({ phase: "send", ...r });
    }

    await supabase.from("outbound_missions").update({
      status: "optimizing", updated_at: new Date().toISOString(),
    }).eq("id", mission_id);

    return jsonResponse({ ok: true, mission_id, trace });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});

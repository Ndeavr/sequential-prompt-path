// mission-orchestrator
// Walks phases 1→5 for a mission, sequentially, and reflects real status.
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
    const run: string[] = phases ?? ["scrape", "enrich", "generate", "send"];
    const trace: any[] = [];
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    let lastSuccessPhase: string | null = null;
    let halted = false;

    if (run.includes("scrape")) {
      const r = await invoke("mission-scrape-trade-cities", { mission_id });
      trace.push({ phase: "scrape", ...r });
      if (!r.ok || (r.data?.scraped ?? 0) === 0) {
        halted = true;
      } else {
        lastSuccessPhase = "scrape";
      }
    }

    if (!halted && run.includes("enrich")) {
      const r = await invoke("mission-enrich-batch", { mission_id });
      trace.push({ phase: "enrich", ...r });
      if (r.ok) lastSuccessPhase = "enrich"; else halted = true;
    }

    if (!halted && run.includes("generate")) {
      const r = await invoke("mission-generate-outreach", { mission_id });
      trace.push({ phase: "generate", ...r });
      if (r.ok) lastSuccessPhase = "generate"; else halted = true;
    }

    if (!halted && run.includes("send")) {
      const r = await invoke("mission-execute-wave", { mission_id, wave_size: 10 });
      trace.push({ phase: "send", ...r });
      if (r.ok) lastSuccessPhase = "send"; else halted = true;
    }

    // Compute real status
    const { data: mission } = await supabase
      .from("outbound_missions").select("scraped_count,sent_count,paid_count,status,last_error")
      .eq("id", mission_id).single();

    let status = mission?.status ?? "idle";
    if (halted) {
      // Keep upstream failure status if already set
      if (!status.endsWith("_failed")) status = `${lastSuccessPhase ?? "scrape"}_failed`;
    } else if ((mission?.paid_count ?? 0) > 0) {
      status = "succeeded";
    } else if ((mission?.sent_count ?? 0) > 0) {
      status = "awaiting_payment";
    } else if ((mission?.scraped_count ?? 0) > 0) {
      status = lastSuccessPhase ?? "enriching";
    }

    await supabase.from("outbound_missions").update({
      status, updated_at: new Date().toISOString(),
      last_error: halted ? { trace } : null,
    }).eq("id", mission_id);

    return jsonResponse({ ok: !halted, mission_id, status, trace });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});

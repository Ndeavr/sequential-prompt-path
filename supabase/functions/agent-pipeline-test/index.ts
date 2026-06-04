/**
 * agent-pipeline-test
 * End-to-end smoke test on ONE lead (or a synthetic one): enrich → score → SMS → checkout.
 * Body: { lead_id?: string, phone?: string, email?: string }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json().catch(() => ({}));
  const steps: any[] = [];

  // 1) Resolve a lead
  let leadId = body?.lead_id as string | undefined;
  if (!leadId) {
    const { data: candidate } = await sb.from("contractor_leads")
      .select("id").eq("score_status", "scored")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    leadId = candidate?.id;
  }
  steps.push({ step: "resolve_lead", lead_id: leadId ?? null });
  if (!leadId) return new Response(JSON.stringify({ ok: false, steps, error: "no lead available" }), {
    status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  // 2) Generate message (best-effort)
  try {
    const r = await sb.functions.invoke("agent-generate-message", { body: { lead_id: leadId, limit: 1 } });
    steps.push({ step: "generate", ok: !r.error, output: r.data ?? r.error });
  } catch (e) { steps.push({ step: "generate", ok: false, error: String(e) }); }

  // 3) Send
  try {
    const r = await sb.functions.invoke("agent-send-outreach", { body: { lead_id: leadId, limit: 1, triggered_by: "pipeline_test" } });
    steps.push({ step: "send", ok: !r.error, output: r.data ?? r.error });
  } catch (e) { steps.push({ step: "send", ok: false, error: String(e) }); }

  // 4) Checkout dry run
  try {
    const r = await sb.functions.invoke("create-contractor-checkout", { body: { plan_code: "pro" } });
    steps.push({ step: "checkout", ok: !r.error, url: (r.data as any)?.url, output: r.data ?? r.error });
  } catch (e) { steps.push({ step: "checkout", ok: false, error: String(e) }); }

  const sentOk = (steps.find(s => s.step === "send")?.output?.output?.sent ?? 0) > 0;
  return new Response(JSON.stringify({
    ok: sentOk,
    lead_id: leadId,
    steps,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

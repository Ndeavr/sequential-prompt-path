/**
 * UNPRO — AI REVENUE AGENT (agent_name: alex-revenue-agent)
 * ---------------------------------------------------------------------------
 * PURPOSE
 * The only autonomous loop allowed to produce an AI-attributed paid conversion:
 *
 *   select prospect -> personalize outreach -> send (existing canonical sender)
 *   -> activation landing -> existing Stripe $350 checkout -> payment
 *
 * NON-NEGOTIABLES
 *  - Uses the EXISTING canonical sender (`send-verified-batch`). All CASL,
 *    consent, opt-out, duplicate and rate-limit gates stay where they are.
 *  - Attribution is written server-side onto the activation token at send time.
 *    It is never derived from a query string and never inferred at payment time.
 *  - The model can only rank prospects and write the message BODY. It can never
 *    change the CTA, the link, the price, or bypass a compliance gate.
 *  - `dry_run` is the default. A real send requires dry_run:false explicitly.
 *  - Every run is recorded in `ai_agent_runs` with real counts.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AGENT_NAME = "alex-revenue-agent";
const AGENT_VERSION = "v1";
const MODEL = "google/gemini-2.5-flash";
const MAX_BATCH = 15;

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface Candidate {
  id: string;
  business_name: string;
  city: string | null;
  category: string | null;
  data_quality_score: number | null;
  sms_eligibility_tier: string | null;
  website_url: string | null;
  email: string | null;
  region: string | null;
}

/** Ask the model to rank + personalize. Never fatal: falls back to deterministic order. */
async function planWithModel(
  candidates: Candidate[],
  batchSize: number,
): Promise<{ picks: Array<{ id: string; message: string; reason: string }>; model_used: boolean; error?: string }> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  const fallback = () => ({
    picks: candidates.slice(0, batchSize).map((c) => ({
      id: c.id,
      message: "",
      reason: "deterministic_quality_rank",
    })),
    model_used: false,
  });
  if (!key) return { ...fallback(), error: "missing_lovable_api_key" };

  const prompt = `Tu es l'agent d'acquisition d'UNPRO (Québec, français uniquement).
Positionnement: LA FIN DES 3 SOUMISSIONS. Un projet. Un bon match. Un PRO.
Offre: pack d'entrée 350 $, paiement unique, jusqu'à 5 rendez-vous exclusifs garantis.

Choisis les ${batchSize} entrepreneurs les plus susceptibles de payer aujourd'hui,
et écris pour chacun un SMS d'ouverture en français québécois.
Règles du message: maximum 240 caractères, pas d'emoji, pas de lien (le lien est
ajouté par le système), ton direct et respectueux, mentionne la ville ou le métier
quand c'est pertinent, jamais de promesse de résultat garanti autre que l'offre.

Candidats:
${candidates.map((c, i) => `${i + 1}. id=${c.id} | ${c.business_name} | ${c.city ?? "?"} | ${c.category ?? "?"} | qualité=${c.data_quality_score ?? "?"} | tier=${c.sms_eligibility_tier ?? "?"}`).join("\n")}

Réponds UNIQUEMENT en JSON:
{"picks":[{"id":"<uuid>","message":"<sms>","reason":"<pourquoi ce prospect>"}]}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (res.status === 429) return { ...fallback(), error: "rate_limited" };
    if (res.status === 402) return { ...fallback(), error: "credits_exhausted" };
    if (!res.ok) return { ...fallback(), error: `gateway_${res.status}: ${(await res.text()).slice(0, 200)}` };
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { ...fallback(), error: "unparseable_model_output" };
    const parsed = JSON.parse(match[0]);
    const valid = new Set(candidates.map((c) => c.id));
    const picks = (Array.isArray(parsed.picks) ? parsed.picks : [])
      .filter((p: any) => p && valid.has(String(p.id)))
      .slice(0, batchSize)
      .map((p: any) => ({
        id: String(p.id),
        // Clamp in code, never in the schema.
        message: String(p.message ?? "").replace(/https?:\/\/\S+/gi, "").trim().slice(0, 240),
        reason: String(p.reason ?? "").slice(0, 200),
      }));
    if (picks.length === 0) return { ...fallback(), error: "model_returned_no_valid_pick" };
    return { picks, model_used: true };
  } catch (e) {
    return { ...fallback(), error: `model_call_failed: ${String(e).slice(0, 200)}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, serviceKey);

  let runId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false;
    const batchSize = Math.min(Math.max(Number(body.limit ?? 5), 1), MAX_BATCH);
    const filterRegion = typeof body.region === "string" && body.region.trim() ? body.region.trim() : null;
    const filterCategory = typeof body.category === "string" && body.category.trim() ? body.category.trim() : null;

    // ── AUTH: admin JWT, or service-role (cron) ───────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    let authorized = token === serviceKey;
    if (!authorized && token) {
      const { data: u } = await sb.auth.getUser(token);
      if (u?.user) {
        const { data: isAdmin } = await sb.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
        authorized = isAdmin === true;
      }
    }
    if (!authorized) return json({ ok: false, error: "forbidden" }, 403);

    // ── RUN RECORD ────────────────────────────────────────────────────────
    const { data: run, error: runErr } = await sb
      .from("ai_agent_runs")
      .insert({
        agent_name: AGENT_NAME,
        agent_version: AGENT_VERSION,
        mode: "ai_agent",
        model: MODEL,
        status: "running",
        dry_run: dryRun,
        params: { limit: batchSize, region: filterRegion, category: filterCategory },
      })
      .select("id")
      .single();
    if (runErr) return json({ ok: false, error: `run_create_failed: ${runErr.message}` }, 500);
    runId = run.id as string;

    // ── CANDIDATE POOL (mirrors the sender's hard gates) ──────────────────
    let q = sb
      .from("verified_contractor_prospects")
      .select("id, business_name, city, region, category, data_quality_score, sms_eligibility_tier, website_url, email")
      .eq("verification_status", "verified")
      .eq("outreach_status", "none")
      .gte("data_quality_score", 80)
      .or("website_url.not.is.null,google_business_url.not.is.null,google_place_id.not.is.null,phone_source_url.not.is.null")
      .order("data_quality_score", { ascending: false })
      .limit(batchSize * 4);
    if (filterRegion) q = q.ilike("region", filterRegion);
    if (filterCategory) q = q.ilike("category", `%${filterCategory}%`);

    const { data: candidates, error: candErr } = await q;
    if (candErr) throw new Error(`candidate_query_failed: ${candErr.message}`);
    const pool = (candidates ?? []) as Candidate[];

    if (pool.length === 0) {
      await sb.from("ai_agent_runs").update({
        status: "completed", finished_at: new Date().toISOString(),
        candidates_count: 0, eligible_count: 0,
        result: { reason: "no_eligible_prospect" },
      }).eq("id", runId);
      return json({ ok: true, run_id: runId, dry_run: dryRun, selected: 0, sent: 0, reason: "no_eligible_prospect" });
    }

    // ── AI DECISION ───────────────────────────────────────────────────────
    const plan = await planWithModel(pool, batchSize);
    const overrides: Record<string, string> = {};
    for (const p of plan.picks) if (p.message) overrides[p.id] = p.message;
    const selectedIds = plan.picks.map((p) => p.id);

    await sb.from("ai_agent_runs").update({
      candidates_count: pool.length,
      eligible_count: pool.length,
      selected_count: selectedIds.length,
    }).eq("id", runId);

    if (dryRun) {
      await sb.from("ai_agent_runs").update({
        status: "completed", finished_at: new Date().toISOString(),
        result: { model_used: plan.model_used, model_error: plan.error ?? null, picks: plan.picks },
      }).eq("id", runId);
      return json({
        ok: true, run_id: runId, dry_run: true,
        candidates: pool.length, selected: selectedIds.length,
        model_used: plan.model_used, model_error: plan.error ?? null,
        preview: plan.picks.map((p) => ({
          ...p,
          business_name: pool.find((c) => c.id === p.id)?.business_name ?? null,
        })),
        sent: 0,
      });
    }

    // ── REAL SEND through the canonical sender ────────────────────────────
    const sendRes = await fetch(`${url}/functions/v1/send-verified-batch`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dry_run: false,
        prospect_ids: selectedIds,
        limit: selectedIds.length,
        message_overrides: overrides,
        attribution: {
          acquisition_origin: "ai_agent",
          agent_name: AGENT_NAME,
          agent_version: AGENT_VERSION,
          agent_run_id: runId,
          agent_session_id: crypto.randomUUID(),
          outreach_variant: plan.model_used ? "ai_personalized_v1" : "template_fallback_v1",
        },
      }),
    });
    const sendJson = await sendRes.json().catch(() => ({}));
    const sent = Number(sendJson?.sent ?? 0);

    await sb.from("ai_agent_runs").update({
      status: sendRes.ok ? "completed" : "failed",
      finished_at: new Date().toISOString(),
      sent_count: sent,
      result: {
        model_used: plan.model_used,
        model_error: plan.error ?? null,
        picks: plan.picks,
        sender_status: sendRes.status,
        sender_response: sendJson,
      },
    }).eq("id", runId);

    return json({
      ok: sendRes.ok, run_id: runId, dry_run: false,
      candidates: pool.length, selected: selectedIds.length, sent,
      model_used: plan.model_used, model_error: plan.error ?? null,
      sender: sendJson,
    }, sendRes.ok ? 200 : 502);
  } catch (e) {
    if (runId) {
      await sb.from("ai_agent_runs").update({
        status: "failed", finished_at: new Date().toISOString(),
        result: { error: String(e).slice(0, 500) },
      }).eq("id", runId);
    }
    console.error("[ai-revenue-agent] fatal", String(e));
    return json({ ok: false, error: String(e).slice(0, 300), run_id: runId }, 500);
  }
});

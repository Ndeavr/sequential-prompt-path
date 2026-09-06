/**
 * UNPRO — matching-profile
 *
 * Progressive save/resume for the contractor MATCHING profile wizard.
 * Service-role only (the table is not readable by anon). Stores the answers
 * that actually drive UNPRO matching (services wanted, refused jobs,
 * territories, project size, client type, availability, languages,
 * credentials, differentiators) and recomputes completion / readiness /
 * eligibility deterministically from real answers — never a marketing number.
 *
 * Attribution (audit id/token, outreach activation token, affiliate ref, utm)
 * is persisted on the row so it survives wizard → plans → Stripe.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Canonical matching fields. Keep in sync with src/lib/matching/matchingQuestions.ts */
const REQUIRED_FIELDS = [
  "services_wanted",
  "services_refused",
  "territories",
  "project_size",
  "client_type",
  "availability",
  "languages",
  "credentials",
  "differentiators",
] as const;

function isAnswered(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "object") return Object.keys(v as Record<string, unknown>).length > 0;
  return true;
}

function computeState(answers: Record<string, unknown>) {
  const missing = REQUIRED_FIELDS.filter((f) => !isAnswered(answers[f]));
  const answered = REQUIRED_FIELDS.length - missing.length;
  const profile_completion = Math.round((answered / REQUIRED_FIELDS.length) * 100);
  // AI readiness = matching data completeness. Structured, verifiable fields
  // only. It is a UNPRO preparation indicator, not an OpenAI/ChatGPT score.
  const ai_profile_readiness = profile_completion;
  const recommendation_eligible =
    isAnswered(answers.services_wanted) &&
    isAnswered(answers.territories) &&
    isAnswered(answers.availability) &&
    profile_completion >= 80;
  return { missing, profile_completion, ai_profile_readiness, recommendation_eligible };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "get");

    if (action === "activate_account") {
      if (!authHeader.startsWith("Bearer ")) return json({ ok: false, error: "authentication_required" }, 401);
      const anon = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
      );
      const { data: { user }, error: userError } = await anon.auth.getUser();
      if (userError || !user) return json({ ok: false, error: "invalid_session" }, 401);

      const token = typeof body.activation_token === "string" ? body.activation_token.trim() : null;
      const context = body.context && typeof body.context === "object" ? body.context : {};
      const { data, error } = await supabase.rpc("activate_my_contractor_account", {
        _activation_token: token || null,
        _context: context,
      });
      if (error) return json({ ok: false, error: error.message }, 400);
      return json(data);
    }

    const session_key = String(body.session_key ?? "").trim();
    if (!session_key || session_key.length < 8) return json({ ok: false, error: "session_key required" }, 400);

    const { data: existing } = await supabase
      .from("contractor_matching_profiles")
      .select("*")
      .eq("session_key", session_key)
      .maybeSingle();

    if (action === "get") {
      return json({ ok: true, profile: existing ?? null });
    }

    if (action !== "save" && action !== "complete") return json({ ok: false, error: "unknown action" }, 400);

    const answers = {
      ...((existing?.answers as Record<string, unknown>) ?? {}),
      ...((body.answers as Record<string, unknown>) ?? {}),
    };
    const state = computeState(answers);

    const row: Record<string, unknown> = {
      session_key,
      answers,
      missing_matching_fields: state.missing,
      profile_completion: state.profile_completion,
      ai_profile_readiness: state.ai_profile_readiness,
      recommendation_eligible: state.recommendation_eligible,
      status: action === "complete" ? "completed" : "in_progress",
    };
    if (action === "complete") row.completed_at = new Date().toISOString();

    // Context / attribution — only ever set, never blanked by a later save.
    for (const k of [
      "contractor_id",
      "prospect_id",
      "audit_id",
      "audit_token",
      "activation_token",
      "affiliate_ref",
      "business_name",
      "city",
      "trade",
    ]) {
      const v = body[k];
      if (v !== undefined && v !== null && String(v).length > 0) row[k] = v;
    }
    if (body.utm && typeof body.utm === "object") {
      row.utm = { ...((existing?.utm as Record<string, unknown>) ?? {}), ...body.utm };
    }

    const { data: saved, error } = await supabase
      .from("contractor_matching_profiles")
      .upsert(row, { onConflict: "session_key" })
      .select("*")
      .maybeSingle();

    if (error) return json({ ok: false, error: error.message }, 500);
    return json({ ok: true, profile: saved });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "unexpected" }, 500);
  }
});

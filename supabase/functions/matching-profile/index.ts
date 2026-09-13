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
        _user_id: user.id,
        _activation_token: token || null,
        _context: context,
      });
      // Structured diagnostic: server reason surfaces, never PII / token / secret.
      if (error) {
        console.error("[matching-profile] activate_account rpc_failed", {
          code: error.code ?? null,
          message: error.message ?? null,
          has_token: !!token,
        });
        return json(
          { ok: false, error: "activation_failed", stage: "rpc", code: error.code ?? null, detail: error.message ?? null },
          400,
        );
      }
      if (!data || (data as Record<string, unknown>).ok !== true) {
        const reason = (data as Record<string, unknown> | null)?.reason ?? "activation_failed";
        console.error("[matching-profile] activate_account rejected", { reason, has_token: !!token });
        return json({ ok: false, error: String(reason), stage: "activation" }, 400);
      }
      return json(data);

    }

    const session_key = String(body.session_key ?? "").trim();
    if (!session_key || session_key.length < 8) return json({ ok: false, error: "session_key required" }, 400);

    // ---------------------------------------------------------------- AUDIT
    // The audit is the authoritative source of the company identity shown in
    // the wizard. Query-string values are never trusted: the audit row is
    // re-read server-side and validated against its session token.
    const auditIdInput = typeof body.audit_id === "string" ? body.audit_id.trim() : "";
    const auditTokenInput = typeof body.audit_token === "string" ? body.audit_token.trim() : "";
    let auditRow: Record<string, unknown> | null = null;
    if (auditIdInput && auditTokenInput) {
      const { data, error } = await supabase
        .from("ai_recommendation_audits")
        .select("id, session_token, business_name, city, trade, contractor_id, prospect_id, readiness_score, baseline")
        .eq("id", auditIdInput)
        .maybeSingle();
      if (error) return json({ ok: false, error: "audit_lookup_failed" }, 500);
      if (data && data.session_token === auditTokenInput) auditRow = data as Record<string, unknown>;
    }
    const auditContext = auditRow
      ? {
          audit_id: String(auditRow.id),
          business_name: (auditRow.business_name as string | null) ?? null,
          city: (auditRow.city as string | null) ?? null,
          trade: (auditRow.trade as string | null) ?? null,
          contractor_id: (auditRow.contractor_id as string | null) ?? null,
          prospect_id: (auditRow.prospect_id as string | null) ?? null,
          readiness_score: (auditRow.readiness_score as number | null) ?? null,
          facts: ((auditRow.baseline as Record<string, unknown> | null)?.facts as unknown[]) ?? [],
        }
      : null;

    let authenticatedUserId: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      const anon = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
      );
      const { data: { user } } = await anon.auth.getUser();
      authenticatedUserId = user?.id ?? null;
    }

    // An authenticated contractor's profile follows the account, not a single
    // browser's localStorage key. The contractor id is always resolved here;
    // it is never accepted from the request body.
    let ownedContractor: {
      id: string;
      business_name: string | null;
      city: string | null;
      specialty: string | null;
      onboarding_status: string | null;
    } | null = null;
    if (authenticatedUserId) {
      const { data, error } = await supabase
        .from("contractors")
        .select("id, business_name, city, specialty, onboarding_status")
        .eq("user_id", authenticatedUserId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return json({ ok: false, error: "contractor_lookup_failed" }, 500);
      ownedContractor = data ?? null;
    }

    const { data: existingBySession, error: sessionLookupError } = await supabase
      .from("contractor_matching_profiles")
      .select("*")
      .eq("session_key", session_key)
      .maybeSingle();
    if (sessionLookupError) return json({ ok: false, error: "profile_lookup_failed" }, 500);

    let existing = existingBySession;
    let effectiveSessionKey = session_key;
    // A localStorage key can survive a sign-out on a shared browser. Never let
    // that stale key expose or overwrite another contractor's matching profile.
    if (
      existingBySession?.contractor_id &&
      ownedContractor &&
      existingBySession.contractor_id !== ownedContractor.id
    ) {
      existing = null;
      // Deterministic account-scoped fallback avoids colliding with the stale
      // unique key while remaining stable on every subsequent request.
      effectiveSessionKey = `${session_key}:${ownedContractor.id}`;
    }
    if (!existing && ownedContractor) {
      const { data: existingByContractor, error: contractorProfileError } = await supabase
        .from("contractor_matching_profiles")
        .select("*")
        .eq("contractor_id", ownedContractor.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (contractorProfileError) return json({ ok: false, error: "profile_lookup_failed" }, 500);
      existing = existingByContractor;
    }
    // A validated audit keeps the SAME draft across devices / new browsers:
    // the wizard resumes exactly where the contractor left it.
    if (!existing && auditContext) {
      const { data: existingByAudit, error: auditProfileError } = await supabase
        .from("contractor_matching_profiles")
        .select("*")
        .eq("audit_id", auditContext.audit_id)
        .is("contractor_id", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (auditProfileError) return json({ ok: false, error: "profile_lookup_failed" }, 500);
      existing = existingByAudit;
    }

    if (action === "get") {
      if (existing?.contractor_id) {
        if (!authenticatedUserId) return json({ ok: false, error: "authentication_required" }, 401);
        const { data: owned } = await supabase.from("contractors").select("id")
          .eq("id", existing.contractor_id).eq("user_id", authenticatedUserId).maybeSingle();
        if (!owned) return json({ ok: false, error: "profile_access_denied" }, 403);
      }
      return json({
        ok: true,
        profile: existing ?? null,
        audit: auditContext,
        audit_valid: Boolean(auditContext),
        current_step: Number(existing?.current_step ?? 0),
      });
    }

    if (action !== "save" && action !== "complete") return json({ ok: false, error: "unknown action" }, 400);

    if (existing?.contractor_id) {
      if (!authenticatedUserId) return json({ ok: false, error: "authentication_required" }, 401);
      const { data: owned } = await supabase.from("contractors").select("id")
        .eq("id", existing.contractor_id).eq("user_id", authenticatedUserId).maybeSingle();
      if (!owned) return json({ ok: false, error: "profile_access_denied" }, 403);
    }

    const answers = {
      ...((existing?.answers as Record<string, unknown>) ?? {}),
      ...((body.answers as Record<string, unknown>) ?? {}),
    };
    const state = computeState(answers);

    const row: Record<string, unknown> = {
      session_key: existing?.session_key ?? effectiveSessionKey,
      answers,
      missing_matching_fields: state.missing,
      profile_completion: state.profile_completion,
      ai_profile_readiness: state.ai_profile_readiness,
      recommendation_eligible: state.recommendation_eligible,
      status: action === "complete" ? "completed" : "in_progress",
    };
    if (action === "complete") row.completed_at = new Date().toISOString();
    // Exact resume point. Monotonic: a stale client can never rewind progress.
    const requestedStep = Number.isFinite(Number(body.current_step)) ? Number(body.current_step) : null;
    if (requestedStep !== null) {
      row.current_step = Math.max(0, Math.max(Number(existing?.current_step ?? 0), Math.trunc(requestedStep)));
    }

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
      if (existing && ["contractor_id", "prospect_id", "activation_token"].includes(k)) continue;
      if (k === "contractor_id") continue;
      const v = body[k];
      if (v !== undefined && v !== null && String(v).length > 0) row[k] = v;
    }
    if (body.utm && typeof body.utm === "object") {
      row.utm = { ...((existing?.utm as Record<string, unknown>) ?? {}), ...body.utm };
    }

    // The validated audit wins over anything the client sent: the company the
    // contractor just saw analysed is the company being completed.
    if (auditContext) {
      row.audit_id = auditContext.audit_id;
      if (auditContext.business_name) row.business_name = auditContext.business_name;
      if (auditContext.city) row.city = auditContext.city;
      if (auditContext.trade) row.trade = auditContext.trade;
      if (auditContext.contractor_id) row.audit_contractor_id = auditContext.contractor_id;
      if (!existing?.prospect_id && auditContext.prospect_id) row.prospect_id = auditContext.prospect_id;
    }

    if (ownedContractor) {
      row.contractor_id = ownedContractor.id;
      if (!existing?.business_name && !body.business_name) {
        row.business_name = ownedContractor.business_name;
      }
      if (!existing?.city && !body.city) row.city = ownedContractor.city;
      if (!existing?.trade && !body.trade) row.trade = ownedContractor.specialty;
    }

    const { data: saved, error } = await supabase
      .from("contractor_matching_profiles")
      .upsert(row, { onConflict: "session_key" })
      .select("*")
      .maybeSingle();

    if (error) return json({ ok: false, error: error.message }, 500);

    // Completion of this canonical wizard must also advance the account-level
    // onboarding state used by the free-entitlement RPC. Never downgrade an
    // already fully completed contractor.
    if (
      action === "complete" &&
      authenticatedUserId &&
      ownedContractor &&
      !["profile_completed", "completed"].includes(ownedContractor.onboarding_status ?? "")
    ) {
      const { error: contractorUpdateError } = await supabase
        .from("contractors")
        .update({ onboarding_status: "profile_completed" })
        .eq("id", ownedContractor.id)
        .eq("user_id", authenticatedUserId);
      if (contractorUpdateError) {
        console.error("[matching-profile] contractor onboarding sync failed", {
          contractor_id: ownedContractor.id,
          code: contractorUpdateError.code ?? null,
        });
        return json({ ok: false, error: "onboarding_sync_failed" }, 500);
      }

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({ onboarding_status: "profile_completed" })
        .eq("user_id", authenticatedUserId)
        .eq("onboarding_completed", false);
      if (profileUpdateError) {
        console.error("[matching-profile] profile onboarding sync failed", {
          contractor_id: ownedContractor.id,
          code: profileUpdateError.code ?? null,
        });
        return json({ ok: false, error: "onboarding_sync_failed" }, 500);
      }
    }

    return json({ ok: true, profile: saved });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "unexpected" }, 500);
  }
});

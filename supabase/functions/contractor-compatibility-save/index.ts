// UNPRO — Autosave du profil de compatibilité entrepreneur.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  compatCors,
  mergeAnswers,
  sanitizeAnswers,
  computeCompletion,
  buildSummary,
  materialize,
  diffAnswers,
} from "../_shared/contractorCompatibility.ts";


import { validateCompatibilityPack } from "../_shared/compatibilityPackPolicy.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...compatCors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: compatCors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    const userId = userData?.user?.id;
    if (userErr || !userId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const requestedId: string | null = typeof body?.contractor_id === "string" ? body.contractor_id : null;

    // Résolution serveur du contractor_id.
    let contractorId: string | null = null;
    const { data: own } = await admin
      .from("contractors")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let actorIsAdmin = false;
    if (requestedId && requestedId !== own?.id) {
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
      actorIsAdmin = !!isAdmin;
      if (!actorIsAdmin) return json({ error: "Forbidden" }, 403);
      contractorId = requestedId;
    } else {
      contractorId = own?.id ?? null;
    }
    if (!contractorId) return json({ error: "Aucune fiche entrepreneur rattachée à ce compte." }, 404);

    const { data: existing, error: existingError } = await admin
      .from("contractor_compatibility_profiles")
      .select("answers, status, current_step, trade_pack")
      .eq("contractor_id", contractorId)
      .maybeSingle();
    const previous = sanitizeAnswers(existing?.answers);
    if (existingError) throw existingError;
    if (existing === undefined) throw new Error("compatibility_profile_read_failed");
    const { data: domain, error: domainError } = await admin.from("contractors").select("specialty").eq("id", contractorId).single();
    if (domainError) throw domainError;
    const { data: domainServices, error: servicesError } = await admin.from("contractor_services").select("service_name_fr").eq("contractor_id", contractorId).eq("is_active", true);
    if (servicesError) throw servicesError;
    let tradePack: string;
    try { tradePack = validateCompatibilityPack(body?.trade_pack, existing?.trade_pack, domain?.specialty, (domainServices ?? []).map((s: { service_name_fr: string }) => s.service_name_fr), actorIsAdmin); }
    catch (e) { return json({ error: e instanceof Error ? e.message : "invalid_trade_pack" }, 400); }
    const answers = mergeAnswers(existing?.answers, body?.answers);
    // Mode admin : correction ciblée d'une fiche existante, sans revenir en brouillon.
    const adminPatch = body?.mode === "admin_patch" && actorIsAdmin;
    // REPAIR (2026-08-27): the finalized status written by
    // contractor-compatibility-finalize / contractor-profile-token is
    // "completed" (never "active"), so admin corrections never regenerated the
    // matching rules. Both values are accepted now.
    const FINALIZED_STATUSES = new Set(["completed", "active"]);
    const wasFinalized = FINALIZED_STATUSES.has(String(existing?.status ?? ""));
    const currentStep = adminPatch
      ? Math.min(Math.max(Number(existing?.current_step) || 6, 1), 6)
      : Math.min(Math.max(Number(body?.current_step) || 1, 1), 6);
    const completion = computeCompletion(answers);
    const changes = diffAnswers(previous, answers);

    const { error: upErr } = await admin.from("contractor_compatibility_profiles").upsert(
      {
        contractor_id: contractorId,
        // REPAIR: never clobber the pack of a multi-trade profile (isolation, etc.).
        trade_pack: tradePack,
        status: adminPatch || wasFinalized ? (existing?.status ?? "draft") : "draft",
        completion_pct: completion,
        current_step: currentStep,
        answers,
        summary: buildSummary(answers),
        floor_project_cents: answers.money?.floor_project_cents ?? null,
        ideal_project_min_cents: answers.money?.ideal_min_cents ?? null,
        ideal_project_max_cents: answers.money?.ideal_max_cents ?? null,
        volume_preference: answers.money?.volume_preference ?? null,
        critical_notes: (answers.critical_notes ?? []).filter(Boolean),
        last_updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "contractor_id" },
    );
    if (upErr) return json({ error: upErr.message }, 400);

    // REPAIR: toute édition admin d'une fiche déjà active régénère les règles de
    // matching (pas seulement le mode `admin_patch`). La régénération est
    // atomique et idempotente : `materialize` désactive puis réécrit les règles
    // déclarées via des upserts sur clé stable.
    const shouldRegenerateRules = wasFinalized;
    await materialize(admin, contractorId, answers, { finalize: shouldRegenerateRules });

    if (actorIsAdmin && changes.length) {
      // Journal granulaire : une entrée par champ modifié.
      await admin.from("admin_action_logs").insert(
        changes.map((c) => ({
          actor_user_id: userId,
          contractor_id: contractorId,
          action_type: "contractor_compatibility_field_changed",
          notes: c.label_fr,
          payload_json: {
            field: c.field,
            before: c.before,
            after: c.after,
            mode: adminPatch ? "admin_patch" : "admin_form",
            completion,
          },
        })),
      );
    } else if (actorIsAdmin) {
      await admin.from("admin_action_logs").insert({
        actor_user_id: userId,
        contractor_id: contractorId,
        action_type: "contractor_profile_preferences_updated",
        notes: `Étape ${currentStep} — complétion ${completion}% (aucun changement)`,
        payload_json: { step: currentStep, completion },
      });
    }

    return json({
      ok: true,
      contractor_id: contractorId,
      completion_pct: completion,
      changes: changes.length,
    });

  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

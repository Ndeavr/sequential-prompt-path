// UNPRO — Autosave du profil de compatibilité entrepreneur.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  compatCors,
  mergeAnswers,
  computeCompletion,
  buildSummary,
  materialize,
} from "../_shared/contractorCompatibility.ts";

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

    const { data: existing } = await admin
      .from("contractor_compatibility_profiles")
      .select("answers")
      .eq("contractor_id", contractorId)
      .maybeSingle();
    const answers = mergeAnswers(existing?.answers, body?.answers);
    const currentStep = Math.min(Math.max(Number(body?.current_step) || 1, 1), 6);
    const completion = computeCompletion(answers);

    const { error: upErr } = await admin.from("contractor_compatibility_profiles").upsert(
      {
        contractor_id: contractorId,
        trade_pack: "excavation_fondation",
        status: "draft",
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

    await materialize(admin, contractorId, answers, { finalize: false });

    if (actorIsAdmin) {
      await admin.from("admin_action_logs").insert({
        actor_user_id: userId,
        contractor_id: contractorId,
        action_type: "contractor_profile_preferences_updated",
        notes: `Étape ${currentStep} — complétion ${completion}%`,
        payload_json: { step: currentStep, completion },
      });
    }

    return json({ ok: true, contractor_id: contractorId, completion_pct: completion });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

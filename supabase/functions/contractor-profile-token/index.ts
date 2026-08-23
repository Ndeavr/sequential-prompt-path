// UNPRO — Accès public au questionnaire de compatibilité via lien sécurisé (sans compte).
// Actions : resolve | confirm_facts | save | finalize
// Le jeton ne donne accès qu'à la fiche liée : aucune autre fiche, aucun accès admin,
// propriétaire, rendez-vous ou paiement n'est joignable ici.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { inviteCors, jsonResponse, resolveInvite } from "../_shared/profileInviteToken.ts";
import {
  mergeAnswers,
  computeCompletion,
  buildSummary,
  materialize,
} from "../_shared/contractorCompatibility.ts";

const PROVENANCE = ["public_source", "confirmed_by_company"] as const;

const TRADE_PACKS = ["excavation_fondation", "isolation_entretoit"] as const;

/** Le pack déjà enregistré prime ; sinon il est déduit de la spécialité de la fiche. */
function resolveTradePack(stored?: string | null, specialty?: string | null): string {
  if (stored && (TRADE_PACKS as readonly string[]).includes(stored)) return stored;
  const s = (specialty ?? "").toLowerCase();
  if (/isolation|entretoit|urethane|ur\u00e9thane|ventilation|vermiculite/.test(s)) {
    return "isolation_entretoit";
  }
  return "excavation_fondation";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: inviteCors });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "resolve";

    const resolved = await resolveInvite(admin, body?.token);
    if ("error" in resolved) return jsonResponse({ error: resolved.error }, resolved.status);
    const invite = resolved.invite;
    const contractorId = invite.contractor_id;

    const loadContext = async () => {
      const [{ data: contractor }, { data: facts }, { data: areas }, { data: profile }] =
        await Promise.all([
          admin
            .from("contractors")
            .select("id, business_name, legal_name, phone, website, address, city, province, postal_code, specialty, rbq_number, rbq_compliance_status, service_areas")
            .eq("id", contractorId)
            .maybeSingle(),
          admin
            .from("contractor_profile_facts")
            .select("field_key, field_label, field_value, provenance, source_url, confirmed_at")
            .eq("contractor_id", contractorId)
            .order("field_key"),
          admin
            .from("contractor_service_areas")
            .select("city_name")
            .eq("contractor_id", contractorId),
          admin
            .from("contractor_compatibility_profiles")
            .select("answers, status, current_step, completion_pct, completed_at, summary, trade_pack")
            .eq("contractor_id", contractorId)
            .maybeSingle(),
        ]);
      return { contractor, facts: facts ?? [], areas: areas ?? [], profile };
    };

    if (action === "resolve") {
      await admin
        .from("contractor_profile_invites")
        .update({
          opened_count: (invite.opened_count ?? 0) + 1,
          last_opened_at: new Date().toISOString(),
        })
        .eq("id", invite.id);

      const ctx = await loadContext();
      if (!ctx.contractor) return jsonResponse({ error: "Fiche introuvable." }, 404);
      return jsonResponse({
        ok: true,
        already_submitted: !!invite.submitted_at,
        trade_pack: resolveTradePack(ctx.profile?.trade_pack, ctx.contractor?.specialty),
        contractor: ctx.contractor,
        facts: ctx.facts,
        service_areas: ctx.areas.map((a: { city_name: string }) => a.city_name),
        profile: ctx.profile ?? null,
      });
    }

    if (action === "confirm_facts") {
      const updates = Array.isArray(body?.facts) ? body.facts : [];
      const now = new Date().toISOString();
      let applied = 0;
      for (const raw of updates.slice(0, 40)) {
        const key = typeof raw?.field_key === "string" ? raw.field_key.slice(0, 80) : null;
        if (!key) continue;
        const provenance = PROVENANCE.includes(raw?.provenance) ? raw.provenance : "confirmed_by_company";
        const patch: Record<string, unknown> = {
          provenance,
          confirmed_at: provenance === "confirmed_by_company" ? now : null,
          updated_at: now,
        };
        if (raw?.field_value !== undefined) patch.field_value = raw.field_value;
        const { error } = await admin
          .from("contractor_profile_facts")
          .update(patch)
          .eq("contractor_id", contractorId)
          .eq("field_key", key);
        if (!error) applied++;
      }

      // Corrections de coordonnées appliquées à la fiche elle-même (jamais « vérifié UNPRO »).
      const corrections = body?.contractor_patch ?? {};
      const allowed: Record<string, string> = {
        business_name: "business_name",
        phone: "phone",
        website: "website",
      };
      const patch: Record<string, unknown> = {};
      for (const [k, col] of Object.entries(allowed)) {
        const v = corrections?.[k];
        if (typeof v === "string" && v.trim()) patch[col] = v.trim().slice(0, 200);
      }
      if (Object.keys(patch).length) {
        patch.updated_at = now;
        await admin.from("contractors").update(patch).eq("id", contractorId);
      }

      await admin.from("admin_action_logs").insert({
        contractor_id: contractorId,
        action_type: "contractor_profile_facts_confirmed",
        notes: `Informations confirmées par l'entreprise via lien questionnaire (${applied} champ(s))`,
        payload_json: { applied, contractor_patch: patch },
      });

      return jsonResponse({ ok: true, applied });
    }

    if (action === "save" || action === "finalize") {
      const { data: contractorRow } = await admin
        .from("contractors")
        .select("specialty")
        .eq("id", contractorId)
        .maybeSingle();
      const { data: existing } = await admin
        .from("contractor_compatibility_profiles")
        .select("answers, trade_pack")
        .eq("contractor_id", contractorId)
        .maybeSingle();
      const answers = mergeAnswers(existing?.answers, body?.answers);
      const completion = computeCompletion(answers);
      const summary = buildSummary(answers);
      const now = new Date().toISOString();
      const finalize = action === "finalize";
      const currentStep = Math.min(Math.max(Number(body?.current_step) || 1, 1), 6);

      const { error: upErr } = await admin.from("contractor_compatibility_profiles").upsert(
        {
          contractor_id: contractorId,
          trade_pack: resolveTradePack(existing?.trade_pack, contractorRow?.specialty),
          status: finalize ? "completed" : "in_progress",
          completion_pct: completion,
          current_step: finalize ? 6 : currentStep,
          answers,
          summary,
          floor_project_cents: answers.money?.floor_project_cents ?? null,
          ideal_project_min_cents: answers.money?.ideal_min_cents ?? null,
          ideal_project_max_cents: answers.money?.ideal_max_cents ?? null,
          volume_preference: answers.money?.volume_preference ?? null,
          critical_notes: (answers.critical_notes ?? []).filter(Boolean),
          completed_at: finalize ? now : null,
          updated_at: now,
        },
        { onConflict: "contractor_id" },
      );
      if (upErr) return jsonResponse({ error: upErr.message }, 400);

      await materialize(admin, contractorId, answers, { finalize });

      if (finalize) {
        await admin
          .from("contractor_profile_invites")
          .update({ submitted_at: now, updated_at: now })
          .eq("id", invite.id);
        await admin.from("admin_action_logs").insert({
          contractor_id: contractorId,
          action_type: "questionnaire_completed",
          notes: `Profil de compatibilité complété via lien questionnaire (${completion}%)`,
          payload_json: { completion, summary, source: "token_invite" },
        });
      }

      return jsonResponse({ ok: true, completion_pct: completion, summary });
    }

    return jsonResponse({ error: "Action inconnue" }, 400);
  } catch (e) {
    return jsonResponse({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

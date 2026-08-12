// activation-goals — Post-$1 qualification flow (Alex, one question at a time).
//
// Actions:
//   "start"       → resolves what UNPRO already knows, returns prefilled answers
//   "save_step"   → persists one answer, advances the step, logs the funnel event
//   "recommend"   → returns ONE personalized plan via the canonical engine
//   "accept"      → records the accepted plan
//
// The plan CODE always comes from _shared/planRecommendation.ts. This function
// never invents pricing and never breaks monotonicity.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  PLAN_LABELS,
  PLAN_LADDER,
  planRank,
  type CanonicalPlanCode,
} from "../_shared/planRecommendation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const STEP_KEYS = [
  "growth_objective",
  "desired_project_types",
  "ideal_project_value_cad",
  "territories",
  "monthly_appointment_goal",
  "exclusions",
  "urgency",
  "exclusivity_preference",
] as const;
type StepKey = (typeof STEP_KEYS)[number];

/**
 * Deterministic plan selection.
 * Demand signal is built from appointment volume, project value, territory
 * breadth, urgency and exclusivity — then mapped monotonically onto the ladder.
 */
function recommendPlan(a: Record<string, unknown>): {
  code: CanonicalPlanCode;
  reason: string;
  factors: { label: string; value: string; weight: number }[];
} {
  const appts = Number(a.monthly_appointment_goal ?? 0);
  const value = Number(a.ideal_project_value_cad ?? 0);
  const territories = Array.isArray(a.territories) ? a.territories.length : 0;
  const urgency = String(a.urgency ?? "");
  const exclusivity = String(a.exclusivity_preference ?? "");

  // Each factor contributes to a 0–100 demand score. No factor alone reaches
  // the top tier: `domination` requires converging strong evidence.
  const apptScore = appts >= 20 ? 30 : appts >= 12 ? 24 : appts >= 6 ? 16 : appts >= 3 ? 9 : 4;
  const valueScore = value >= 50000 ? 25 : value >= 20000 ? 20 : value >= 8000 ? 14 : value >= 3000 ? 8 : 4;
  const territoryScore = territories >= 5 ? 20 : territories >= 3 ? 15 : territories >= 2 ? 10 : 5;
  const urgencyScore = urgency === "immediate" ? 15 : urgency === "3_mois" ? 10 : 5;
  const exclusivityScore = exclusivity === "exclusif" ? 10 : exclusivity === "prioritaire" ? 6 : 2;

  const score = apptScore + valueScore + territoryScore + urgencyScore + exclusivityScore;

  // Monotonic thresholds: a lower score can never map to a higher plan.
  const THRESHOLDS: { min: number; code: CanonicalPlanCode }[] = [
    { min: 88, code: "domination" },
    { min: 74, code: "premium" },
    { min: 60, code: "pro" },
    { min: 46, code: "croissance" },
    { min: 32, code: "local" },
    { min: 0, code: "presence" },
  ];
  let code = THRESHOLDS.find((t) => score >= t.min)!.code;

  // Rule 2: the top tier is never granted without explicit exclusivity intent.
  if (code === "domination" && exclusivity !== "exclusif") code = "premium";

  // Rule 3: low confidence (no volume answer) never exceeds the mid entry plan.
  const lowConfidence = !appts || !value;
  if (lowConfidence && planRank(code) > planRank("croissance")) code = "croissance";

  const reason = [
    appts ? `${appts} rendez-vous visés par mois` : "volume à préciser",
    value ? `projets d'environ ${value.toLocaleString("fr-CA")} $` : null,
    territories ? `${territories} territoire${territories > 1 ? "s" : ""}` : null,
    exclusivity === "exclusif" ? "exclusivité demandée" : null,
    urgency === "immediate" ? "démarrage immédiat" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    code,
    reason: `Plan ${PLAN_LABELS[code]} recommandé : ${reason}.`,
    factors: [
      { label: "Rendez-vous souhaités", value: appts ? `${appts}/mois` : "—", weight: apptScore },
      { label: "Valeur de projet visée", value: value ? `${value.toLocaleString("fr-CA")} $` : "—", weight: valueScore },
      { label: "Étendue du territoire", value: territories ? `${territories} zone(s)` : "—", weight: territoryScore },
      { label: "Urgence", value: urgency || "—", weight: urgencyScore },
      { label: "Exclusivité", value: exclusivity || "—", weight: exclusivityScore },
    ],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json().catch(() => ({}))) as {
      action?: string;
      token?: string;
      step_key?: string;
      value?: unknown;
    };
    const action = String(body.action ?? "start");
    const token = String(body.token ?? "").trim();
    if (!token || token.length > 128) return json({ ok: false, reason: "invalid_token" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tk } = await supabase
      .from("verified_prospect_tokens")
      .select("token, prospect_id")
      .eq("token", token)
      .maybeSingle();
    if (!tk) return json({ ok: false, reason: "token_not_found" }, 404);

    const { data: prospect } = await supabase
      .from("verified_contractor_prospects")
      .select("id, business_name, city, category, service_areas")
      .eq("id", tk.prospect_id)
      .maybeSingle();

    // Existing goals row, or a fresh one prefilled from what UNPRO already knows.
    let { data: goals } = await supabase
      .from("contractor_activation_goals")
      .select("*")
      .eq("activation_token", token)
      .maybeSingle();

    if (!goals) {
      const knownTerritories = Array.isArray(prospect?.service_areas)
        ? (prospect!.service_areas as unknown[]).map(String).filter(Boolean)
        : prospect?.city
          ? [prospect.city]
          : [];
      const { data: created, error: insErr } = await supabase
        .from("contractor_activation_goals")
        .insert({
          activation_token: token,
          prospect_id: tk.prospect_id,
          territories: knownTerritories,
          desired_project_types: prospect?.category ? [prospect.category] : [],
          answers: {},
          current_step: 0,
        })
        .select("*")
        .single();
      if (insErr) {
        console.error("[activation-goals] insert_failed", insErr.message);
        return json({ ok: false, reason: "init_failed" }, 500);
      }
      goals = created;
    }

    const logEvent = async (eventType: string, metadata: Record<string, unknown>, idem: string) => {
      try {
        await supabase.rpc("record_engagement_event", {
          _event_type: eventType,
          _channel: "web",
          _status: eventType,
          _provider: "app",
          _tracking_id: token,
          _prospect_id: tk.prospect_id,
          _source_table: "contractor_activation_goals",
          _source_row_id: token,
          _metadata: metadata,
          _idempotency_key: idem,
        });
      } catch (e) {
        console.error("[activation-goals] event_failed", String(e));
      }
    };

    // ------------------------------------------------------------- save_step
    if (action === "save_step") {
      const key = String(body.step_key ?? "") as StepKey;
      if (!STEP_KEYS.includes(key)) return json({ ok: false, reason: "unknown_step" }, 400);

      const answers = { ...(goals.answers as Record<string, unknown>), [key]: body.value };
      const idx = STEP_KEYS.indexOf(key);
      const patch: Record<string, unknown> = {
        answers,
        current_step: Math.max(Number(goals.current_step ?? 0), idx + 1),
        updated_at: new Date().toISOString(),
      };
      // Mirror into the typed column so reporting stays queryable.
      patch[key] = body.value;

      const complete = STEP_KEYS.every((k) => answers[k] !== undefined && answers[k] !== null);
      if (complete && !goals.completed_at) patch.completed_at = new Date().toISOString();

      const { data: updated, error } = await supabase
        .from("contractor_activation_goals")
        .update(patch)
        .eq("id", goals.id)
        .select("*")
        .single();
      if (error) {
        console.error("[activation-goals] update_failed", error.message);
        return json({ ok: false, reason: "save_failed" }, 500);
      }

      await logEvent("goal_step_completed", { step: key, index: idx }, `goal_step:${token}:${key}`);
      if (complete) await logEvent("goals_completed", { steps: STEP_KEYS.length }, `goals_completed:${token}`);

      return json({ ok: true, goals: updated, complete });
    }

    // ------------------------------------------------------------- recommend
    if (action === "recommend") {
      const answers = { ...(goals.answers as Record<string, unknown>) };
      for (const k of STEP_KEYS) if (answers[k] == null) answers[k] = goals[k as keyof typeof goals];

      const rec = recommendPlan(answers);
      await supabase
        .from("contractor_activation_goals")
        .update({
          recommended_plan_code: rec.code,
          recommended_plan_reason: rec.reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", goals.id);

      await logEvent("plan_recommended", { plan: rec.code }, `plan_recommended:${token}`);

      // Real pricing comes from the canonical catalog, never from this function.
      const { data: plans } = await supabase
        .from("plans")
        .select("code, name, monthly_price_cad, description")
        .in("code", PLAN_LADDER as unknown as string[]);

      return json({
        ok: true,
        recommended: { code: rec.code, label: PLAN_LABELS[rec.code], reason: rec.reason, factors: rec.factors },
        plans: plans ?? [],
      });
    }

    // ---------------------------------------------------------------- accept
    if (action === "accept") {
      const code = String(body.value ?? "");
      if (!(PLAN_LADDER as unknown as string[]).includes(code)) {
        return json({ ok: false, reason: "unknown_plan" }, 400);
      }
      await supabase
        .from("contractor_activation_goals")
        .update({ accepted_plan_code: code, accepted_at: new Date().toISOString() })
        .eq("id", goals.id);
      await logEvent("plan_accepted", { plan: code }, `plan_accepted:${token}`);
      return json({ ok: true, accepted: code });
    }

    // ----------------------------------------------------------------- start
    await logEvent("goals_started", {}, `goals_started:${token}`);
    return json({
      ok: true,
      goals,
      prefill: {
        business_name: prospect?.business_name ?? null,
        city: prospect?.city ?? null,
        category: prospect?.category ?? null,
        territories: goals.territories ?? [],
        desired_project_types: goals.desired_project_types ?? [],
      },
      steps: STEP_KEYS,
    });
  } catch (e) {
    console.error("[activation-goals] fatal", String(e));
    return json({ ok: false, reason: "internal_error" }, 500);
  }
});

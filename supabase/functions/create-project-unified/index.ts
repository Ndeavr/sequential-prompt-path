/**
 * create-project-unified — point d'entrée unique de création de projet
 * propriétaire (Clara voix, Clara clavardage, formulaire, calculateurs).
 *
 * Garanties :
 *  - session vérifiée obligatoire ;
 *  - conversion atomique : propriété + projet + demande + clé d'idempotence
 *    écrites dans UNE seule transaction (RPC create_estimator_project) ;
 *  - deux requêtes simultanées retournent le même projet et la même demande ;
 *  - adresse vérifiée obligatoire : aucune « adresse à confirmer » ;
 *  - la demande (lead) est autoritaire : aucun projet orphelin ;
 *  - la compatibilité provient du moteur canonique `match-lead`, jamais d'un
 *    entrepreneur fictif.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

import {
  ALLOWED_CATEGORIES,
  ALLOWED_PROPERTY_TYPES,
  ALLOWED_SOURCES,
  ALLOWED_URGENCY,
  CANONICAL_MATCHING_CATEGORY,
  MAX_BUDGET,
  MAX_PAYLOAD_BYTES,
  normalizeAddressServer,
  validateEstimatePayload,
  validateEstimatorInputs,
  validFirstName,
} from "./validation.ts";

interface Body {
  description?: string;
  category?: string;
  category_label?: string;
  city?: string | null;
  postal_code?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  property_type?: string | null;
  source?: string;
  idempotency_key?: string;
  first_name?: string | null;
  email?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  urgency?: string | null;
  estimate?: Record<string, unknown>;
  inputs?: Record<string, unknown>;
  attribution?: Record<string, unknown>;
  source_page?: string | null;
  consent_marketing?: boolean;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function money(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > MAX_BUDGET) return null;
  return Math.round(v);
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const raw = await req.text();
    if (raw.length > MAX_PAYLOAD_BYTES) return json({ error: "payload_too_large" }, 413);
    let body: Body;
    try {
      body = JSON.parse(raw || "{}") as Body;
    } catch {
      return json({ error: "invalid_json" }, 400);
    }

    // 1. Session vérifiée obligatoire.
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "auth_required" }, 401);
    const { data: userData } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    const userId = userData.user?.id ?? null;
    if (!userId) return json({ error: "auth_required" }, 401);

    // 2. Validation stricte (allowlists et bornes numériques).
    const source = text(body.source, 60) ?? "manual";
    if (!ALLOWED_SOURCES.has(source)) return json({ error: "invalid_source" }, 400);

    const category = text(body.category, 60);
    if (source === "renovation_calculator" && (!category || !ALLOWED_CATEGORIES.has(category))) {
      return json({ error: "invalid_category" }, 400);
    }

    const idempotencyKey = text(body.idempotency_key, 120);
    if (!idempotencyKey || idempotencyKey.length < 8) {
      return json({ error: "invalid_idempotency_key" }, 400);
    }

    const address = text(body.address, 300);
    if (!address) return json({ error: "verified_address_required" }, 400);
    const normalizedAddress = normalizeAddressServer(address);
    if (!normalizedAddress) return json({ error: "verified_address_required" }, 400);

    const city = text(body.city, 120);
    const postalCode = text(body.postal_code, 12);

    const propertyTypeRaw = text(body.property_type, 40);
    if (propertyTypeRaw && !ALLOWED_PROPERTY_TYPES.has(propertyTypeRaw)) {
      return json({ error: "invalid_property_type" }, 400);
    }

    const urgency = text(body.urgency, 20) ?? "normal";
    if (!ALLOWED_URGENCY.has(urgency)) return json({ error: "invalid_urgency" }, 400);

    const budgetMin = money(body.budget_min);
    const budgetMax = money(body.budget_max);
    if (budgetMin === null || budgetMax === null || budgetMax < budgetMin) {
      return json({ error: "invalid_budget_range" }, 400);
    }

    const lat =
      typeof body.latitude === "number" && Number.isFinite(body.latitude) &&
        Math.abs(body.latitude) <= 90
        ? body.latitude
        : null;
    const lng =
      typeof body.longitude === "number" && Number.isFinite(body.longitude) &&
        Math.abs(body.longitude) <= 180
        ? body.longitude
        : null;

    let firstName = text(body.first_name, 80);
    let estimatorInputs: Record<string, unknown> | null = null;
    let estimatePayload: Record<string, unknown> | null = null;

    if (source === "renovation_calculator") {
      firstName = validFirstName(body.first_name);
      if (!firstName) return json({ error: "invalid_first_name" }, 400);

      const inputs = validateEstimatorInputs(category as string, body.inputs);
      if (!inputs.ok) return json({ error: inputs.error }, 400);
      estimatorInputs = inputs.value;

      const est = validateEstimatePayload(body.estimate);
      if (!est.ok) return json({ error: est.error }, 400);
      estimatePayload = est.value;
    }

    const payload = {
      first_name: firstName,
      email: text(body.email, 160),
      consent_marketing: body.consent_marketing === true,
      estimate: estimatePayload,
      inputs: estimatorInputs,
      attribution: body.attribution ?? null,
      postal_code: postalCode,
      property_type: propertyTypeRaw,
      // Sous-catégorie d'interface réellement choisie, conservée telle quelle ;
      // l'admissibilité au jumelage utilise la catégorie canonique.
      ui_category: category,
      matching_category: source === "renovation_calculator" ? CANONICAL_MATCHING_CATEGORY : category,
    };


    // 3. Conversion atomique (une seule transaction côté base).
    const { data: rpc, error: rpcError } = await supabase.rpc("create_estimator_project", {
      p_user_id: userId,
      p_idempotency_key: idempotencyKey,
      p_category: category,
      p_category_label: text(body.category_label, 120) ?? category ?? "Projet",
      p_description: text(body.description, 4000),
      p_source: source,
      p_source_page: text(body.source_page, 300),
      p_address: address,
      p_normalized_address: normalizedAddress,
      p_city: city,
      p_postal_code: postalCode,
      p_latitude: lat,
      p_longitude: lng,
      p_property_type: propertyTypeRaw,
      p_budget_min: budgetMin,
      p_budget_max: budgetMax,
      p_urgency: urgency,
      p_payload: payload,
    });

    if (rpcError || !rpc) {
      const code = String(rpcError?.message ?? "conversion_failed");
      const known = [
        "verified_address_required",
        "invalid_budget_range",
        "invalid_idempotency_key",
        "lead_creation_failed",
        "profile_unavailable",
      ].find((k) => code.includes(k));
      console.error("[create-project-unified] rpc", code);
      return json({ error: known ?? "conversion_failed" }, known ? 400 : 500);
    }

    const result = rpc as { project_id: string; lead_id: string; reused: boolean };
    const projectId = result.project_id;
    const leadId = result.lead_id;

    // 4. Signal de demande (meilleur effort, idempotent sur project_id).
    if (city && category) {
      try {
        await supabase.functions.invoke("demand-signal-create", {
          body: {
            project_id: projectId,
            homeowner_id: userId,
            city,
            category,
            postal_code: postalCode,
            estimated_project_value: budgetMax,
            estimated_ltv: budgetMax,
            urgency_score: urgency === "urgent" ? 9 : urgency === "flexible" ? 3 : 5,
            metadata: { source },
          },
        });
      } catch (e) {
        console.warn("[create-project-unified] demand signal", String(e));
      }
    }

    // 5. Moteur de compatibilité canonique (jamais un second matcher).
    // Un rejeu recalcule toujours l'état réel du jumelage.
    let matchingError = false;
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/match-lead`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      if (!res.ok) {
        matchingError = true;
        console.error("[create-project-unified] match-lead http", res.status);
      } else {
        const out = (await res.json().catch(() => null)) as { ok?: boolean } | null;
        if (!out?.ok) matchingError = true;
      }
    } catch (e) {
      matchingError = true;
      console.warn("[create-project-unified] match-lead", String(e));
    }

    if (matchingError) {
      // Aucune réussite annoncée : la demande reste honnêtement en attente.
      await supabase
        .from("leads")
        .update({ matching_status: "pending" })
        .eq("id", leadId)
        .in("matching_status", ["pending", "empty"]);
      return json({
        projectId,
        leadId,
        hasMatches: false,
        reused: result.reused,
        matchingStatus: "pending",
      });
    }

    // 6. État réellement persisté + garde d'admissibilité stricte.
    const hasMatches = await hasEligibleRecommendation(supabase, leadId);

    return json({
      projectId,
      leadId,
      hasMatches,
      reused: result.reused,
      matchingStatus: hasMatches ? "matched" : "empty",
    });
  } catch (e) {
    console.error("[create-project-unified]", e instanceof Error ? e.message : String(e));
    return json({ error: "unexpected_error" }, 500);
  }
});

/**
 * Une recommandation n'existe que si un entrepreneur réel, actif et
 * admissible, avec licence RBQ vérifiée et valide, est assigné.
 */
async function hasEligibleRecommendation(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  leadId: string,
): Promise<boolean> {
  try {
    const { data: lead } = await supabase
      .from("leads")
      .select("assigned_contractor_id, matching_status")
      .eq("id", leadId)
      .maybeSingle();

    const contractorId = lead?.assigned_contractor_id ?? null;
    if (!contractorId || lead?.matching_status !== "matched") return false;

    const { data: pro } = await supabase
      .from("contractors")
      .select(
        "id, account_status, verification_status, is_accepting_appointments, booking_enabled, rbq_number, rbq_compliance_status, rbq_verified_at, rbq_expiry_date",
      )
      .eq("id", contractorId)
      .maybeSingle();

    if (!pro) return false;
    const rbqValid =
      typeof pro.rbq_number === "string" &&
      pro.rbq_number.trim().length > 0 &&
      pro.rbq_compliance_status === "verified" &&
      !!pro.rbq_verified_at &&
      (!pro.rbq_expiry_date || new Date(pro.rbq_expiry_date).getTime() > Date.now());

    const eligible =
      pro.account_status === "active" &&
      pro.verification_status === "verified" &&
      pro.booking_enabled === true &&
      pro.is_accepting_appointments === true &&
      rbqValid;

    if (!eligible) {
      // Retour honnête au parcours « aucune correspondance ».
      await supabase
        .from("leads")
        .update({
          status: "no_match",
          matching_status: "empty",
          assigned_contractor_id: null,
          assigned_match_id: null,
        })
        .eq("id", leadId);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

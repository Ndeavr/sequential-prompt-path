/**
 * UNPRO — Activation gratuite atomique (entreprise de services locaux, 12 mois).
 *
 * Point d'entrée client unique vers la transaction canonique serveur
 * (`free-service-activate` → `public.activate_free_service_account_from_context`).
 *
 * Règles :
 *  - jamais de Stripe, de checkout, de carte ni de choix de forfait ;
 *  - une activation n'est réelle QUE si le serveur confirme `activated` ;
 *  - idempotent : double clic, refresh et retour OAuth ne créent pas de doublon ;
 *  - une offre indisponible est un état normal, pas une erreur technique.
 */
import { supabase } from "@/integrations/supabase/client";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import type { RoleIntentMeta } from "@/services/auth/roleIntent";

export interface FreeActivationContext {
  prospectId?: string | null;
  businessName?: string | null;
  city?: string | null;
  trade?: string | null;
  source?: string | null;
  utm?: Record<string, string>;
}

export type FreeActivationResult =
  | {
      kind: "activated";
      alreadyActivated: boolean;
      contractorId: string | null;
      prospectId: string | null;
      membershipId: string | null;
      onboardingSessionId: string | null;
      founderEnd: string | null;
    }
  | { kind: "not_eligible"; reason: string }
  | { kind: "error"; failureStep: string; failureCode: string; message: string };

/** Paramètres d'attribution conservés — jamais le jeton brut. */
const TRACKED_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "ref",
  "aff",
  "affiliate",
  "campaign_id",
  "city",
  "ville",
  "metier",
  "trade",
  "category_slug",
];

/**
 * Reconstruit le contexte d'activation à partir de l'URL courante et de
 * l'intention de rôle persistée (elle survit à l'OTP, au lien courriel,
 * à la redirection OAuth et au rafraîchissement).
 */
export function buildFreeActivationContext(
  search: string,
  intent?: RoleIntentMeta | null,
): FreeActivationContext {
  const params = new URLSearchParams(search);
  const utm: Record<string, string> = {};
  for (const key of TRACKED_PARAMS) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  for (const [key, value] of Object.entries(intent?.attribution ?? {})) {
    if (!utm[key] && TRACKED_PARAMS.includes(key) && value) utm[key] = value;
  }

  return {
    prospectId:
      params.get("prospect_id") ||
      params.get("prospect") ||
      params.get("p") ||
      intent?.prospectId ||
      null,
    businessName: params.get("entreprise") || params.get("business_name") || intent?.businessName || null,
    city: params.get("ville") || params.get("city") || intent?.city || null,
    trade: params.get("metier") || params.get("trade") || params.get("category_slug") || intent?.trade || null,
    source: "free_service_activation",
    utm,
  };
}

interface ServerPayload {
  ok?: boolean;
  kind?: string;
  reason?: string;
  failure_step?: string;
  failure_code?: string;
  activated?: boolean;
  already_claimed?: boolean;
  contractor_id?: string | null;
  prospect_id?: string | null;
  membership_id?: string | null;
  onboarding_session_id?: string | null;
  founder_end?: string | null;
}

/**
 * Exécute l'activation gratuite atomique et émet la télémétrie canonique.
 * `profile_activated` n'est émis qu'après confirmation serveur.
 */
export async function runFreeServiceActivation(
  context: FreeActivationContext,
): Promise<FreeActivationResult> {
  void logFunnelEvent({
    event_type: "free_activation_started",
    step: "free_service_activation",
    prospect_id: context.prospectId ?? null,
    metadata: { city: context.city ?? null, trade: context.trade ?? null },
  });

  let payload: ServerPayload | null = null;
  try {
    const { data, error } = await supabase.functions.invoke("free-service-activate", {
      body: {
        prospect_id: context.prospectId ?? null,
        business_name: context.businessName ?? null,
        city: context.city ?? null,
        trade: context.trade ?? null,
        source: context.source ?? "free_service_activation",
        utm: context.utm ?? {},
      },
    });
    payload = (data ?? null) as ServerPayload | null;
    if (error && !payload) {
      return failure("free_activation_request", "activation_request_failed", error.message);
    }
  } catch (e) {
    return failure(
      "free_activation_request",
      "activation_request_failed",
      e instanceof Error ? e.message : "unknown_error",
    );
  }

  if (!payload) {
    return failure("free_activation_request", "empty_response", "Réponse vide du serveur.");
  }

  if (payload.ok !== true || payload.activated !== true) {
    const reason = payload.failure_code || payload.reason || "activation_not_completed";
    if (payload.kind === "not_eligible") {
      void logFunnelEvent({
        event_type: "free_year_unavailable",
        step: "free_service_activation",
        prospect_id: context.prospectId ?? null,
        metadata: { reason },
      });
      return { kind: "not_eligible", reason };
    }
    return failure(payload.failure_step || "free_activation_transaction", reason, reason);
  }

  const common = {
    contractor_id: payload.contractor_id ?? null,
    prospect_id: payload.prospect_id ?? null,
    metadata: {
      membership_id: payload.membership_id ?? null,
      onboarding_session_id: payload.onboarding_session_id ?? null,
      already_activated: payload.already_claimed === true,
      free_offer: true,
      checkout_created: false,
    },
  };

  void logFunnelEvent({ ...common, event_type: "profile_claimed", step: "free_service_claim" });
  void logFunnelEvent({
    ...common,
    event_type: "free_year_entitlement_created",
    step: "free_service_entitlement",
    metadata: { ...common.metadata, founder_end: payload.founder_end ?? null },
  });
  void logFunnelEvent({ ...common, event_type: "profile_activated", step: "free_service_activation" });
  void logFunnelEvent({ ...common, event_type: "onboarding_resumed", step: "free_service_onboarding" });

  return {
    kind: "activated",
    alreadyActivated: payload.already_claimed === true,
    contractorId: payload.contractor_id ?? null,
    prospectId: payload.prospect_id ?? null,
    membershipId: payload.membership_id ?? null,
    onboardingSessionId: payload.onboarding_session_id ?? null,
    founderEnd: payload.founder_end ?? null,
  };
}

function failure(step: string, code: string, message: string): FreeActivationResult {
  void logFunnelEvent({
    event_type: "activation_error",
    step: "free_service_activation",
    metadata: { failure_step: step, failure_code: code },
  });
  return { kind: "error", failureStep: step, failureCode: code, message };
}

/** Message humain, recuperable, jamais technique. */
export function freeActivationMessage(result: FreeActivationResult): string {
  if (result.kind === "activated") return "Votre profil UNPRO est actif.";
  if (result.kind === "not_eligible") {
    switch (result.reason) {
      case "category_not_eligible":
        return "L'année gratuite ne s'applique pas à ce type de service. Votre profil reste disponible en inscription standard.";
      case "city_full":
      case "city_category_full":
      case "not_eligible":
        return "Les places gratuites de votre ville et de votre service sont déjà prises. Nous poursuivons en inscription standard.";
      case "free_service_context_incomplete":
        return "Il manque votre entreprise, votre ville ou votre service pour activer l'année gratuite.";
      default:
        return "L'année gratuite n'est pas disponible dans votre cas. Nous poursuivons en inscription standard.";
    }
  }
  return "L'activation n'a pas pu être complétée. Réessayez : rien n'a été perdu.";
}

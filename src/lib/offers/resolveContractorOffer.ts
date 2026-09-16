/**
 * UNPRO — Décision d'offre entrepreneur (source unique).
 *
 * La décision appartient au serveur : `public.resolve_contractor_offer`.
 * Ce module ne fait que normaliser la catégorie déclarée et transporter la
 * réponse. Aucune surface ne doit deviner l'offre ni inventer un nombre de
 * places restantes.
 */

import { supabase } from "@/integrations/supabase/client";
import { normalizeServiceCategory } from "@/lib/localServices/categories";
import { normalizeProjectTrade } from "@/lib/offers/projectTrades";

export type ContractorOfferKind = "free_founding" | "express_350" | "none" | "unknown";

export interface ContractorOfferDecision {
  offer: ContractorOfferKind;
  categoryGroup: "local_service" | "professional" | "project_trade" | null;
  /** Places réellement restantes dans la ville (max 10). `null` = inconnu. */
  cityRemaining: number | null;
  reason: string | null;
  /** Slug canonique retenu, `null` si le libellé n'a pas été reconnu. */
  categorySlug: string | null;
}

export const UNKNOWN_OFFER: ContractorOfferDecision = {
  offer: "unknown",
  categoryGroup: null,
  cityRemaining: null,
  reason: "category_not_recognized",
  categorySlug: null,
};

/**
 * Normalise un libellé libre vers un slug canonique.
 * Ordre : services résidentiels d'abord, puis métiers projet.
 * `null` si rien n'est reconnu — on demande alors la précision à l'humain.
 */
export function normalizeOfferCategory(raw: string | null | undefined): string | null {
  return normalizeServiceCategory(raw) ?? normalizeProjectTrade(raw);
}

function parseDecision(value: unknown, categorySlug: string | null): ContractorOfferDecision {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ...UNKNOWN_OFFER, categorySlug, reason: "invalid_response" };
  }
  const payload = value as Record<string, unknown>;
  const offer = payload.offer;
  const group = payload.category_group;
  const remaining = payload.city_remaining;

  return {
    offer:
      offer === "free_founding" || offer === "express_350" || offer === "none"
        ? offer
        : "unknown",
    categoryGroup:
      group === "local_service" || group === "professional" || group === "project_trade"
        ? group
        : null,
    cityRemaining: typeof remaining === "number" && Number.isFinite(remaining) ? remaining : null,
    reason: typeof payload.reason === "string" ? payload.reason : null,
    categorySlug,
  };
}

export interface ResolveOfferInput {
  city: string | null | undefined;
  /** Slug canonique déjà connu, sinon libellé libre. */
  categorySlug?: string | null;
  categoryLabel?: string | null;
}

export async function resolveContractorOffer(
  input: ResolveOfferInput,
): Promise<ContractorOfferDecision> {
  const slug =
    (input.categorySlug && input.categorySlug.trim()) ||
    normalizeOfferCategory(input.categoryLabel) ||
    null;

  if (!slug) return UNKNOWN_OFFER;

  const client = supabase as unknown as {
    rpc: (
      name: "resolve_contractor_offer",
      args: { p_city: string; p_category_slug: string },
    ) => Promise<{ data: unknown; error: unknown | null }>;
  };

  const { data, error } = await client.rpc("resolve_contractor_offer", {
    p_city: (input.city ?? "").trim(),
    p_category_slug: slug,
  });
  if (error) throw error;
  return parseDecision(data, slug);
}

/**
 * Phrase publique de rareté. `cityRemaining` doit venir du serveur.
 * Sans chiffre fiable : formulation sans chiffre, jamais de fausse rareté.
 */
export function freeOfferScarcitySentence(
  cityRemaining: number | null,
  city: string | null | undefined,
): string {
  const place = city ? ` à ${city}` : "";
  if (cityRemaining == null || !Number.isFinite(cityRemaining)) {
    return `Offre de lancement réservée aux 10 premières entreprises admissibles${place}, selon disponibilité.`;
  }
  if (cityRemaining <= 0) return `Les 10 places de lancement${place} sont comblées.`;
  if (cityRemaining === 1) return `12 mois gratuits — il reste 1 place${place}.`;
  return `12 mois gratuits — il reste ${cityRemaining} places${place}.`;
}

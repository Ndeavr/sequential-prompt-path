/**
 * UNPRO — Décision d'offre entrepreneur (lecture serveur).
 * Aucune valeur par défaut optimiste : tant que le serveur n'a pas répondu,
 * l'état reste « inconnu » et aucune offre n'est affichée.
 */
import { useEffect, useState } from "react";
import {
  resolveContractorOffer,
  UNKNOWN_OFFER,
  type ContractorOfferDecision,
} from "@/lib/offers/resolveContractorOffer";

export interface UseContractorOfferResult {
  decision: ContractorOfferDecision;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useContractorOffer(
  city: string | null | undefined,
  categoryLabel: string | null | undefined,
  categorySlug?: string | null,
): UseContractorOfferResult {
  const [decision, setDecision] = useState<ContractorOfferDecision>(UNKNOWN_OFFER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    resolveContractorOffer({ city, categoryLabel, categorySlug })
      .then((result) => {
        if (cancelled) return;
        setDecision(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setDecision(UNKNOWN_OFFER);
        setError(err instanceof Error ? err.message : "offer_resolution_failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [city, categoryLabel, categorySlug, tick]);

  return { decision, loading, error, reload: () => setTick((t) => t + 1) };
}

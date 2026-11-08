/**
 * Taille de projet : seulement les fourchettes DÉCLARÉES par l'entrepreneur
 * (plan personnalisé → input_payload.project_size_mix, provenance « declared »). Aucune fourchette universelle.
 * Exclusion seulement si tout le budget du propriétaire tombe dans une taille
 * refusée et qu'aucune taille acceptée ne le recoupe; sinon neutre ou bonus.
 */
export interface DeclaredSize {
  code?: string;
  stance?: "preferred" | "accepted" | "refused";
  minValue?: number | null;
  maxValue?: number | null;
}
export type SizeFit = { fit: "refused" | "preferred" | "neutral"; reason: string | null };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function readDeclaredSizes(inputPayload: unknown): DeclaredSize[] {
  const mix = (inputPayload as { project_size_mix?: { provenance?: unknown; sizes?: unknown } } | null | undefined)?.project_size_mix;
  if (!mix || mix.provenance !== "declared") return [];
  const sizes = mix.sizes;
  return Array.isArray(sizes) ? (sizes.filter((s) => s && typeof s === "object") as DeclaredSize[]) : [];
}

export function projectSizeFit(sizes: DeclaredSize[], budget: { min?: number | null; max?: number | null }): SizeFit {
  const lo0 = num(budget.min) ?? num(budget.max), hi0 = num(budget.max) ?? num(budget.min);
  if (lo0 === null || hi0 === null) return { fit: "neutral", reason: null };
  const lo = Math.min(lo0, hi0), hi = Math.max(lo0, hi0);
  const ranged = sizes.filter((s) => num(s.minValue) !== null || num(s.maxValue) !== null);
  if (!ranged.length) return { fit: "neutral", reason: null };
  const sMin = (s: DeclaredSize) => num(s.minValue) ?? 0;
  const sMax = (s: DeclaredSize) => num(s.maxValue) ?? Number.POSITIVE_INFINITY;
  const overlaps = (s: DeclaredSize) => sMin(s) <= hi && sMax(s) >= lo;
  const covers = (s: DeclaredSize) => sMin(s) <= lo && sMax(s) >= hi;
  const accepted = ranged.filter((s) => s.stance !== "refused");
  if (accepted.some((s) => s.stance === "preferred" && overlaps(s))) return { fit: "preferred", reason: "Taille de projet recherchée (déclarée)" };
  if (accepted.some(overlaps)) return { fit: "neutral", reason: null };
  if (ranged.some((s) => s.stance === "refused" && covers(s))) return { fit: "refused", reason: "Taille de projet refusée (déclarée)" };
  return { fit: "neutral", reason: null };
}

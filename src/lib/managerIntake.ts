/** Pont gestionnaire → Clara : contexte immeuble/unité/besoin transmis via le deep-link existant /alex?q=. */
export const MANAGER_NEEDS = [
  "Remplacer une toilette", "Serrure", "Peinture", "Robinet", "Chauffage", "Nettoyage", "Urgence",
] as const;

export function buildManagerClaraLink(input: { need: string; buildingName?: string | null; unit?: string }): string {
  const unit = (input.unit ?? "").replace(/[^\p{L}\p{N} -]/gu, "").trim().slice(0, 20);
  const parts = [`Je suis gestionnaire immobilier. Besoin : ${input.need}`];
  if (input.buildingName) parts.push(`immeuble « ${input.buildingName} »`);
  if (unit) parts.push(`unité ${unit}`);
  return `/alex?q=${encodeURIComponent(parts.join(", ") + ".")}`;
}

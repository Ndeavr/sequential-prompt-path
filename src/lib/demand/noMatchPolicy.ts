/** Declared scope only; never an eligibility, demand or payment proof. */
export function normalizeNoMatchService(value: string): string {
  const s = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  if (/capage|habillage de colonnes|recouvrement de colonnes|recouvrir.*colonnes|ferblanterie architecturale|pliage aluminium/.test(s)) return "capage_colonnes_exterieures";
  return s.replace(/\s+/g, " ");
}

export function noMatchConsentCopy(city?: string): string {
  const location = city?.trim() ? `à ${city.trim()}` : "dans votre secteur";
  return `Nous n’avons pas encore de professionnel vérifié qui répond à tous vos critères pour ce projet ${location}. Avec votre accord, je conserve votre demande et lance une recherche ciblée. Nous vous informerons si un professionnel approprié est trouvé.`;
}

export function canRetainNoMatch(input: { consent?: boolean; projectId?: string; contact?: string }): boolean {
  return input.consent === true && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.projectId ?? "") && Boolean(input.contact?.trim());
}

export function demandLandingRequest(city: string, category: string): string {
  const valid = (v: string) => v.trim().length > 0 && v.length <= 120 && !/[\x00-\x1f<>]/.test(v);
  if (!valid(city) || !valid(category)) throw new Error("invalid_segment");
  return `recruitment-landing-resolver?${new URLSearchParams({ city: city.trim(), category: normalizeNoMatchService(category) })}`;
}
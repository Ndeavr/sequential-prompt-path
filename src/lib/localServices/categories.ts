/**
 * UNPRO — Catégories de services résidentiels locaux (segment « 1 an gratuit »).
 *
 * Source de vérité applicative pour la NORMALISATION d'un libellé libre
 * (import CRM, scraping conforme, saisie humaine) vers un slug canonique
 * présent dans `public.founder_eligible_categories` (group_type = 'local_service').
 *
 * Règles :
 *  - jamais d'invention : un libellé non reconnu retourne `null` (statut « pending ») ;
 *  - le miroir serveur vit dans `supabase/functions/_shared/localServiceCategories.ts`
 *    et doit rester identique (Deno ne peut pas importer `src/`).
 */

export interface LocalServiceCategory {
  slug: string;
  name_fr: string;
  /** Mots-clés normalisés (sans accents, minuscules) permettant la reconnaissance. */
  keywords: string[];
}

export const LOCAL_SERVICE_CATEGORIES: LocalServiceCategory[] = [
  { slug: "ouverture-fermeture-piscine", name_fr: "Ouverture et fermeture de piscine", keywords: ["ouverture piscine", "fermeture piscine", "fermeture de piscine", "ouverture de piscine", "hivernation piscine"] },
  { slug: "entretien-piscine-spa", name_fr: "Entretien de piscine et spa", keywords: ["entretien piscine", "entretien de piscine", "piscine", "spa", "traitement eau piscine"] },
  { slug: "lavage-de-vitres", name_fr: "Lavage de vitres", keywords: ["lavage de vitres", "lavage vitres", "laveur de vitres", "nettoyage de vitres", "fenetres"] },
  { slug: "nettoyage-gouttieres", name_fr: "Nettoyage de gouttières", keywords: ["gouttiere", "gouttieres", "nettoyage de gouttieres"] },
  { slug: "lavage-pression", name_fr: "Lavage extérieur et à pression", keywords: ["lavage a pression", "lavage pression", "pression", "entretien exterieur", "nettoyage exterieur"] },
  { slug: "abris-temporaires", name_fr: "Installation et retrait d'abris temporaires", keywords: ["abri tempo", "abris tempo", "tempo", "abri d auto", "abri auto", "abri temporaire", "abris temporaires"] },
  { slug: "nettoyage-tapis", name_fr: "Nettoyage de tapis et carpettes", keywords: ["nettoyage de tapis", "tapis", "carpette", "carpettes", "shampooing tapis"] },
  { slug: "nettoyage-mobilier", name_fr: "Nettoyage de mobilier et tissus d'ameublement", keywords: ["mobilier", "meubles rembourres", "tissus d ameublement", "sofa", "divan"] },
  { slug: "nettoyage-conduits", name_fr: "Nettoyage de conduits d'air et de sécheuse", keywords: ["conduits", "conduit d air", "conduits d air", "secheuse", "echangeur d air"] },
  { slug: "entretien-menager", name_fr: "Entretien ménager", keywords: ["entretien menager", "menage", "femme de menage", "nettoyage residentiel", "service de menage"] },
  { slug: "grand-menage", name_fr: "Grand ménage", keywords: ["grand menage", "menage en profondeur", "grand nettoyage"] },
  { slug: "gestion-parasitaire", name_fr: "Gestion parasitaire / extermination", keywords: ["extermination", "exterminateur", "gestion parasitaire", "parasites", "punaises", "fourmis", "souris"] },
  { slug: "entretien-gazon", name_fr: "Entretien de gazon", keywords: ["gazon", "pelouse", "tonte", "entretien de pelouse", "entretien de gazon"] },
  { slug: "entretien-paysager", name_fr: "Entretien paysager", keywords: ["paysagement", "paysagiste", "amenagement paysager", "entretien paysager", "haie"] },
  { slug: "deneigement", name_fr: "Déneigement", keywords: ["deneigement", "deneiger", "neige", "souffleuse"] },
  { slug: "nettoyage-planchers", name_fr: "Nettoyage de planchers, céramique et coulis", keywords: ["planchers", "ceramique", "coulis", "nettoyage de planchers"] },
  { slug: "nettoyage-matelas", name_fr: "Nettoyage de matelas", keywords: ["matelas", "nettoyage de matelas"] },
  { slug: "nettoyage-apres-construction", name_fr: "Nettoyage après construction ou rénovation", keywords: ["apres construction", "apres renovation", "nettoyage de chantier", "fin de chantier"] },
  { slug: "ramonage-cheminee", name_fr: "Ramonage de cheminée", keywords: ["ramonage", "ramoneur", "cheminee"] },
  { slug: "homme-a-tout-faire", name_fr: "Homme à tout faire / petits travaux", keywords: ["homme a tout faire", "petits travaux", "handyman", "bricoleur"] },
  { slug: "demenagement", name_fr: "Déménagement", keywords: ["demenagement", "demenageur", "transport de meubles"] },
  { slug: "organisation-rangement", name_fr: "Organisation et rangement", keywords: ["organisation", "rangement", "desencombrement"] },
  { slug: "entretien-preventif-domicile", name_fr: "Maintenance / services à la maison", keywords: ["entretien preventif", "maintenance residentielle", "services a la maison"] },
  { slug: "autre-service-residentiel", name_fr: "Autre service résidentiel", keywords: [] },
];

export const OTHER_LOCAL_SERVICE_SLUG = "autre-service-residentiel";

/** Minuscules, sans accents, ponctuation réduite à des espaces. */
export function normalizeLabel(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Reconnaît un libellé libre. Retourne `null` si aucun mot-clé ne correspond :
 * la fiche reste alors « en attente » et n'est jamais classée au hasard.
 */
export function normalizeServiceCategory(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = normalizeLabel(raw);
  if (!text) return null;

  for (const cat of LOCAL_SERVICE_CATEGORIES) {
    if (normalizeLabel(cat.slug.replace(/-/g, " ")) === text) return cat.slug;
    if (normalizeLabel(cat.name_fr) === text) return cat.slug;
  }
  let best: { slug: string; length: number } | null = null;
  for (const cat of LOCAL_SERVICE_CATEGORIES) {
    for (const kw of cat.keywords) {
      if (text.includes(kw) && (!best || kw.length > best.length)) {
        best = { slug: cat.slug, length: kw.length };
      }
    }
  }
  return best?.slug ?? null;
}

export function categoryName(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return LOCAL_SERVICE_CATEGORIES.find((c) => c.slug === slug)?.name_fr ?? null;
}

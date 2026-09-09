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
  { slug: "entretien-piscine-spa", name_fr: "Entretien de piscine et spa", keywords: ["entretien piscine", "entretien de piscine", "entretien de spa", "service de piscine", "traitement eau piscine"] },
  { slug: "lavage-de-vitres", name_fr: "Lavage de vitres", keywords: ["lavage de vitres", "lavage vitres", "laveur de vitres", "nettoyage de vitres", "lavage de fenetres", "nettoyage de fenetres"] },
  { slug: "nettoyage-gouttieres", name_fr: "Nettoyage de gouttières", keywords: ["nettoyage de gouttieres", "nettoyage gouttieres", "nettoyage de gouttiere"] },
  { slug: "lavage-pression", name_fr: "Lavage extérieur et à pression", keywords: ["lavage a pression", "lavage pression", "nettoyage a pression", "nettoyage exterieur"] },
  { slug: "abris-temporaires", name_fr: "Installation et retrait d'abris temporaires", keywords: ["abri tempo", "abris tempo", "abri d auto", "abri auto", "abri temporaire", "abris temporaires"] },
  { slug: "nettoyage-tapis", name_fr: "Nettoyage de tapis et carpettes", keywords: ["nettoyage de tapis", "nettoyage tapis", "carpette", "carpettes", "shampooing tapis"] },
  { slug: "nettoyage-mobilier", name_fr: "Nettoyage de mobilier et tissus d'ameublement", keywords: ["nettoyage de mobilier", "meubles rembourres", "tissus d ameublement", "nettoyage de sofa", "nettoyage de divan"] },
  { slug: "nettoyage-conduits", name_fr: "Nettoyage de conduits d'air et de sécheuse", keywords: ["nettoyage de conduits", "conduit d air", "conduits d air", "conduit de secheuse", "echangeur d air"] },
  { slug: "entretien-menager", name_fr: "Entretien ménager", keywords: ["entretien menager", "menage", "femme de menage", "nettoyage residentiel", "service de menage"] },
  { slug: "grand-menage", name_fr: "Grand ménage", keywords: ["grand menage", "menage en profondeur", "grand nettoyage"] },
  { slug: "gestion-parasitaire", name_fr: "Gestion parasitaire / extermination", keywords: ["extermination", "exterminateur", "gestion parasitaire", "punaises", "controle des parasites"] },
  { slug: "entretien-gazon", name_fr: "Entretien de gazon", keywords: ["gazon", "pelouse", "tonte", "entretien de pelouse", "entretien de gazon"] },
  { slug: "entretien-paysager", name_fr: "Entretien paysager", keywords: ["paysagement", "paysagiste", "amenagement paysager", "entretien paysager", "taille de haie"] },
  { slug: "deneigement", name_fr: "Déneigement", keywords: ["deneigement", "deneiger", "souffleuse"] },
  { slug: "nettoyage-planchers", name_fr: "Nettoyage de planchers, céramique et coulis", keywords: ["nettoyage de planchers", "nettoyage de plancher", "nettoyage de ceramique", "nettoyage de coulis"] },
  { slug: "nettoyage-matelas", name_fr: "Nettoyage de matelas", keywords: ["nettoyage de matelas"] },
  { slug: "nettoyage-apres-construction", name_fr: "Nettoyage après construction ou rénovation", keywords: ["nettoyage apres construction", "nettoyage apres renovation", "nettoyage de chantier", "nettoyage fin de chantier"] },
  { slug: "ramonage-cheminee", name_fr: "Ramonage de cheminée", keywords: ["ramonage", "ramoneur"] },
  { slug: "homme-a-tout-faire", name_fr: "Homme à tout faire / petits travaux", keywords: ["homme a tout faire", "petits travaux", "handyman", "bricoleur"] },
  { slug: "demenagement", name_fr: "Déménagement", keywords: ["demenagement", "demenageur", "transport de meubles"] },
  { slug: "organisation-rangement", name_fr: "Organisation et rangement", keywords: ["organisation et rangement", "desencombrement"] },
  { slug: "entretien-preventif-domicile", name_fr: "Maintenance / services à la maison", keywords: ["entretien preventif", "maintenance residentielle", "services a la maison"] },
  { slug: "debarras-ramassage", name_fr: "Débarras et ramassage d'encombrants", keywords: ["debarras", "debarrasseur", "ramassage d encombrants", "ramassage encombrants", "collecte d encombrants", "enlevement d encombrants", "encombrants", "objets volumineux", "ramassage d objets volumineux", "enlevement de meubles", "ramassage de meubles", "vidage de maison", "vidage de logement", "vidage de garage", "vidange de maison", "nettoyage apres demenagement", "collecte de gros rebuts", "gros rebuts", "junk removal", "junk hauling", "junk", "bulky item removal", "property cleanout", "garage cleanout", "basement cleanout", "estate cleanout", "cleanout"] },
  { slug: "autre-service-residentiel", name_fr: "Autre service résidentiel", keywords: [] },
];

/**
 * Métiers de rénovation / construction : jamais admissibles au segment gratuit.
 * Si l'un de ces marqueurs est présent, aucune reconnaissance par mot-clé n'est
 * tentée (un installateur de portes et fenêtres n'est pas un laveur de vitres).
 */
export const EXCLUDED_TRADE_MARKERS: string[] = [
  "fenetre", "fenetres", "porte", "portes", "vitrerie", "vitrier",
  "toiture", "couvreur", "toit", "plomberie", "plombier", "electricien",
  "electricite", "chauffage", "climatisation", "cvac", "renovation", "renover",
  "construction", "constructeur", "entrepreneur general", "excavation",
  "fondation", "charpente", "menuiserie", "menuisier", "ebeniste", "armoires",
  "cuisine", "salle de bain", "ceramique", "revetement", "recouvrement",
  "asphalte", "pavage", "pave", "beton", "maconnerie", "briquetage",
  "isolation", "gypse", "peinture", "peintre", "plancher", "planchers",
  "escalier", "cloture", "terrasse", "patio", "piscine creusee", "installation de piscine",
  "sous sol", "drain", "puits", "arpenteur", "inspecteur", "notaire", "courtier",
];

function hasExcludedTrade(text: string): boolean {
  return EXCLUDED_TRADE_MARKERS.some(
    (m) => text === m || text.startsWith(`${m} `) || text.endsWith(` ${m}`) || text.includes(` ${m} `),
  );
}


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
  // Métier de rénovation/construction : jamais reclassé en service local gratuit.
  if (hasExcludedTrade(text)) return null;
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

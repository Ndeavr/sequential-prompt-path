/**
 * UNPRO — Métiers « projet » (Activation Express 350 $).
 *
 * Miroir applicatif de `public.project_trade_categories`. Sert uniquement à
 * NORMALISER un libellé libre vers un slug canonique. Aucune décision d'offre
 * n'est prise ici : la décision appartient à la RPC `resolve_contractor_offer`.
 *
 * Le miroir Deno vit dans `supabase/functions/_shared/projectTradeCategories.ts`
 * et doit rester identique.
 */

import { normalizeLabel } from "./localServiceCategories.ts";

export interface ProjectTradeCategory {
  slug: string;
  name_fr: string;
  keywords: string[];
}

export const PROJECT_TRADE_CATEGORIES: ProjectTradeCategory[] = [
  {
    slug: "entrepreneur-general",
    name_fr: "Entrepreneur général",
    keywords: ["entrepreneur general", "entrepreneurs generaux", "construction generale", "general contractor"],
  },
  {
    slug: "renovation",
    name_fr: "Rénovation",
    keywords: [
      "renovation", "renovations", "renover", "reno", "cuisine et salle de bain",
      "armoires de cuisine", "salle de bain", "menuiserie", "charpente", "gypse",
      "revetement exterieur", "portes et fenetres", "remodeling",
    ],
  },
  {
    slug: "fondation-drain-excavation",
    name_fr: "Fondation, drain et excavation",
    keywords: [
      "fondation", "fondations", "drain francais", "drain", "excavation",
      "impermeabilisation", "fissure de fondation", "sous oeuvre",
    ],
  },
  {
    slug: "toiture",
    name_fr: "Toiture",
    keywords: ["toiture", "couvreur", "couvreurs", "toit", "bardeaux", "membrane elastomere", "roofing"],
  },
  {
    slug: "plomberie",
    name_fr: "Plomberie",
    keywords: ["plomberie", "plombier", "plombiers", "plumbing"],
  },
  {
    slug: "electricite",
    name_fr: "Électricité",
    keywords: ["electricite", "electricien", "electriciens", "maitre electricien", "electrical"],
  },
  {
    slug: "cvac-thermopompe",
    name_fr: "CVAC et thermopompes",
    keywords: [
      "cvac", "cvc", "thermopompe", "thermopompes", "climatisation", "chauffage",
      "ventilation", "fournaise", "hvac",
    ],
  },
  {
    slug: "pavage",
    name_fr: "Pavage et asphalte",
    keywords: ["pavage", "asphalte", "pave uni", "paves", "beton", "maconnerie", "briquetage", "scellant asphalte"],
  },
  {
    slug: "amenagement-majeur",
    name_fr: "Aménagement paysager majeur",
    keywords: [
      "amenagement paysager", "amenagement exterieur", "terrassement", "muret",
      "terrasse", "patio", "piscine creusee", "installation de piscine", "cloture",
    ],
  },
  {
    slug: "decontamination-vermiculite",
    name_fr: "Décontamination et vermiculite",
    keywords: [
      "decontamination", "vermiculite", "amiante", "moisissure", "moisissures",
      "apres sinistre", "apres degat d eau", "restauration apres sinistre",
    ],
  },
];

/** Retourne le slug canonique du métier projet, ou `null` si non reconnu. */
export function normalizeProjectTrade(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = normalizeLabel(raw);
  if (!text) return null;

  for (const cat of PROJECT_TRADE_CATEGORIES) {
    if (normalizeLabel(cat.slug.replace(/-/g, " ")) === text) return cat.slug;
    if (normalizeLabel(cat.name_fr) === text) return cat.slug;
  }

  let best: { slug: string; length: number } | null = null;
  for (const cat of PROJECT_TRADE_CATEGORIES) {
    for (const kw of cat.keywords) {
      if (text.includes(kw) && (!best || kw.length > best.length)) {
        best = { slug: cat.slug, length: kw.length };
      }
    }
  }
  return best?.slug ?? null;
}

export function projectTradeName(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return PROJECT_TRADE_CATEGORIES.find((c) => c.slug === slug)?.name_fr ?? null;
}

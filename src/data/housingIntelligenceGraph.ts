/**
 * Quebec Housing Intelligence Graph — semantic links between residential topics.
 * Used by articles to power internal linking blocks.
 */
export interface GraphNode {
  slug: string;
  label: string;
  related: string[]; // slugs
}

export const HOUSING_GRAPH: Record<string, GraphNode> = {
  humidite: { slug: "humidite", label: "Humidité résidentielle", related: ["ventilation", "moisissure", "isolation", "condensation-fenetres"] },
  ventilation: { slug: "ventilation", label: "Ventilation", related: ["humidite", "humidite-grenier", "qualite-air"] },
  isolation: { slug: "isolation", label: "Isolation", related: ["pertes-chaleur", "facture-hydro", "etancheite-air"] },
  moisissure: { slug: "moisissure", label: "Moisissure", related: ["humidite", "ventilation", "infiltration"] },
  "facture-hydro": { slug: "facture-hydro", label: "Facture Hydro élevée", related: ["isolation", "pertes-chaleur", "etancheite-air"] },
  "pertes-chaleur": { slug: "pertes-chaleur", label: "Pertes de chaleur", related: ["isolation", "etancheite-air", "facture-hydro"] },
  "barrages-de-glace": { slug: "barrages-de-glace", label: "Barrages de glace", related: ["ventilation", "isolation", "humidite-grenier"] },
  "etancheite-air": { slug: "etancheite-air", label: "Étanchéité à l'air", related: ["isolation", "facture-hydro", "pertes-chaleur"] },
  "humidite-grenier": { slug: "humidite-grenier", label: "Humidité au grenier", related: ["ventilation", "isolation", "barrages-de-glace", "moisissure"] },
  "condensation-fenetres": { slug: "condensation-fenetres", label: "Condensation aux fenêtres", related: ["humidite", "ventilation", "isolation"] },
};

export function getRelated(slug: string): GraphNode[] {
  const node = HOUSING_GRAPH[slug];
  if (!node) return [];
  return node.related.map((s) => HOUSING_GRAPH[s]).filter(Boolean);
}

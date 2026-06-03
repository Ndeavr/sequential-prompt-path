/**
 * Property Intelligence Ticker — static feed (v1).
 * fr-CA. Static for now; future: branch on Supabase signals.
 */
export interface IntelligenceInsight {
  id: string;
  label: string;
  city?: string;
}

export const HOME_INTELLIGENCE_INSIGHTS: IntelligenceInsight[] = [
  { id: "humidity-laval", label: "Les problèmes d'humidité augmentent actuellement à Laval.", city: "Laval" },
  { id: "ice-dams-mtl", label: "Les barrages de glace sont fréquents cette semaine à Montréal.", city: "Montréal" },
  { id: "old-homes", label: "Les maisons construites avant 1985 présentent souvent des pertes d'air importantes." },
  { id: "attic-condensation", label: "La condensation au grenier suit les écarts de température récents." },
  { id: "hydro-spikes", label: "Les factures Hydro grimpent dans les secteurs mal isolés du Plateau." },
  { id: "rosemont-drains", label: "Les refoulements de drain français reviennent dans Rosemont." },
];

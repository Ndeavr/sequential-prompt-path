/**
 * UNPRO — Profile Completion Service
 * Detects missing fields, calculates completion %, manages delta scoring.
 */

export interface ProfileData {
  business_name?: string | null;
  phone?: string | null;
  email?: string | null;
  website_url?: string | null;
  description_short?: string | null;
  description_long?: string | null;
  primary_city?: string | null;
  region?: string | null;
  logo_url?: string | null;
  photo_count?: number;
  service_count?: number;
  location_count?: number;
  license_number?: string | null;
  insurance_info?: string | null;
}

export interface MissingField {
  field: string;
  label: string;
  priority: "critical" | "important" | "optimization";
  impact: number;
  alexPrompt: string;
}

export interface CompletionResult {
  percentage: number;
  filled: number;
  total: number;
  missingFields: MissingField[];
  aippEstimate: number;
}

const FIELD_DEFS: {
  key: keyof ProfileData;
  label: string;
  priority: MissingField["priority"];
  impact: number;
  alexPrompt: string;
  check: (v: unknown) => boolean;
}[] = [
  { key: "business_name", label: "Nom d'entreprise", priority: "critical", impact: 8, alexPrompt: "Quel est le nom de votre entreprise?", check: (v) => typeof v === "string" && v.trim().length > 1 },
  { key: "phone", label: "Téléphone", priority: "critical", impact: 6, alexPrompt: "Quel est votre numéro de téléphone?", check: (v) => typeof v === "string" && v.replace(/\D/g, "").length >= 10 },
  { key: "primary_city", label: "Ville principale", priority: "critical", impact: 6, alexPrompt: "Dans quelle ville êtes-vous basé principalement?", check: (v) => typeof v === "string" && v.trim().length > 1 },
  { key: "description_long", label: "Description détaillée", priority: "critical", impact: 8, alexPrompt: "Décrivez vos services en quelques phrases. Qu'est-ce qui vous distingue?", check: (v) => typeof v === "string" && v.trim().length >= 40 },
  { key: "logo_url", label: "Logo", priority: "important", impact: 5, alexPrompt: "Il manque votre logo. Voulez-vous l'ajouter maintenant?", check: (v) => typeof v === "string" && v.trim().length > 5 },
  { key: "email", label: "Courriel", priority: "important", impact: 4, alexPrompt: "Quel est votre courriel professionnel?", check: (v) => typeof v === "string" && v.includes("@") },
  { key: "website_url", label: "Site web", priority: "important", impact: 5, alexPrompt: "Avez-vous un site web? Partagez l'URL.", check: (v) => typeof v === "string" && v.trim().length > 5 },
  { key: "description_short", label: "Description courte", priority: "optimization", impact: 3, alexPrompt: "Décrivez votre entreprise en une phrase.", check: (v) => typeof v === "string" && v.trim().length >= 10 },
  { key: "region", label: "Région", priority: "optimization", impact: 3, alexPrompt: "Dans quelle région du Québec opérez-vous?", check: (v) => typeof v === "string" && v.trim().length > 1 },
  { key: "license_number", label: "Numéro de licence RBQ", priority: "important", impact: 7, alexPrompt: "Avez-vous un numéro de licence RBQ?", check: (v) => typeof v === "string" && v.trim().length > 3 },
  { key: "insurance_info", label: "Assurance responsabilité", priority: "important", impact: 5, alexPrompt: "Avez-vous une assurance responsabilité? Ajoutez les détails.", check: (v) => typeof v === "string" && v.trim().length > 3 },
];

const ASSET_CHECKS: {
  label: string;
  priority: MissingField["priority"];
  impact: number;
  alexPrompt: string;
  check: (d: ProfileData) => boolean;
  field: string;
}[] = [
  { field: "photos", label: "Photos de projets", priority: "important", impact: 6, alexPrompt: "Ajoutez 3 photos de vos réalisations et votre profil sera beaucoup plus convaincant.", check: (d) => (d.photo_count ?? 0) >= 3 },
  { field: "services", label: "Services offerts", priority: "critical", impact: 7, alexPrompt: "Quel est votre service principal?", check: (d) => (d.service_count ?? 0) >= 1 },
  { field: "locations", label: "Zones desservies", priority: "important", impact: 5, alexPrompt: "Quelles villes desservez-vous principalement?", check: (d) => (d.location_count ?? 0) >= 1 },
];

export function detectMissingFields(data: ProfileData): CompletionResult {
  const allChecks = FIELD_DEFS.length + ASSET_CHECKS.length;
  let filled = 0;
  const missing: MissingField[] = [];

  for (const f of FIELD_DEFS) {
    if (f.check(data[f.key])) {
      filled++;
    } else {
      missing.push({ field: f.key, label: f.label, priority: f.priority, impact: f.impact, alexPrompt: f.alexPrompt });
    }
  }

  for (const a of ASSET_CHECKS) {
    if (a.check(data)) {
      filled++;
    } else {
      missing.push({ field: a.field, label: a.label, priority: a.priority, impact: a.impact, alexPrompt: a.alexPrompt });
    }
  }

  // Sort by priority then impact
  const priorityOrder: Record<string, number> = { critical: 0, important: 1, optimization: 2 };
  missing.sort((a, b) => (priorityOrder[a.priority] - priorityOrder[b.priority]) || (b.impact - a.impact));

  const percentage = Math.round((filled / allChecks) * 100);
  const totalImpact = missing.reduce((sum, m) => sum + m.impact, 0);
  const maxImpact = [...FIELD_DEFS.map(f => f.impact), ...ASSET_CHECKS.map(a => a.impact)].reduce((s, v) => s + v, 0);
  const aippEstimate = Math.round(((maxImpact - totalImpact) / maxImpact) * 100);

  return { percentage, filled, total: allChecks, missingFields: missing, aippEstimate };
}

export function calculateDelta(before: number, after: number): { delta: number; label: string } {
  const delta = after - before;
  return {
    delta,
    label: delta > 0 ? `+${delta} points` : delta === 0 ? "Aucun changement" : `${delta} points`,
  };
}

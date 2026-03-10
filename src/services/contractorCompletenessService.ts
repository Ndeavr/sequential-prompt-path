/**
 * UNPRO — Contractor Completeness Service
 * Calculates profile completeness % and lists missing items.
 */

interface ContractorData {
  business_name?: string | null;
  specialty?: string | null;
  description?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  license_number?: string | null;
  insurance_info?: string | null;
  address?: string | null;
  province?: string | null;
  website?: string | null;
  logo_url?: string | null;
  years_experience?: number | null;
}

interface CompletenessResult {
  percentage: number;
  completed: string[];
  missing: string[];
}

const FIELDS: { key: keyof ContractorData; label: string; weight: number }[] = [
  { key: "business_name", label: "Nom de l'entreprise", weight: 15 },
  { key: "specialty", label: "Spécialité / catégorie", weight: 12 },
  { key: "description", label: "Description", weight: 12 },
  { key: "city", label: "Ville", weight: 10 },
  { key: "phone", label: "Téléphone", weight: 8 },
  { key: "email", label: "Courriel", weight: 5 },
  { key: "license_number", label: "Numéro de licence", weight: 10 },
  { key: "insurance_info", label: "Assurance", weight: 10 },
  { key: "address", label: "Adresse", weight: 5 },
  { key: "province", label: "Province", weight: 3 },
  { key: "website", label: "Site web", weight: 3 },
  { key: "logo_url", label: "Logo", weight: 4 },
  { key: "years_experience", label: "Années d'expérience", weight: 3 },
];

function isFilled(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (typeof value === "number" && value <= 0) return false;
  return true;
}

export function getContractorCompleteness(data: ContractorData): CompletenessResult {
  const totalWeight = FIELDS.reduce((s, f) => s + f.weight, 0);
  let earned = 0;
  const completed: string[] = [];
  const missing: string[] = [];

  for (const field of FIELDS) {
    if (isFilled(data[field.key])) {
      earned += field.weight;
      completed.push(field.label);
    } else {
      missing.push(field.label);
    }
  }

  return {
    percentage: Math.round((earned / totalWeight) * 100),
    completed,
    missing,
  };
}

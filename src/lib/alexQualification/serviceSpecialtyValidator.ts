/**
 * Alex V3 — Service ↔ Contractor Specialty Validator
 * Hard rule: never display a contractor whose specialty doesn't match the qualified category.
 */

export interface ContractorLike {
  id: string;
  specialty?: string | null;
  specialties?: string[] | null;
  category?: string | null;
}

const CATEGORY_ALIASES: Record<string, string[]> = {
  roofing: ["roofing", "toiture", "couvreur"],
  foundation: ["foundation", "fondation"],
  electrical: ["electrical", "electricien", "électricien"],
  plumbing: ["plumbing", "plombier", "plomberie"],
  hvac: ["hvac", "cvac", "thermopompe", "chauffage", "climatisation"],
  insulation: ["insulation", "isolation"],
  mold: ["mold", "moisissure", "decontamination"],
  windows: ["windows", "fenetres", "fenêtres"],
  kitchen_reno: ["kitchen", "cuisine", "renovation", "rénovation"],
  landscaping: ["landscaping", "paysagement", "paysagiste"],
};

function normalize(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function validateContractorMatch(
  serviceCategory: string | null,
  contractor: ContractorLike,
): { ok: boolean; reason?: string } {
  if (!serviceCategory) return { ok: false, reason: "no_service_category" };
  const aliases = CATEGORY_ALIASES[serviceCategory.toLowerCase()] ?? [serviceCategory.toLowerCase()];
  const candidates = [
    contractor.specialty,
    contractor.category,
    ...(contractor.specialties ?? []),
  ].map(normalize).filter(Boolean);

  const ok = candidates.some(c => aliases.some(a => c.includes(normalize(a))));
  return ok ? { ok: true } : { ok: false, reason: "specialty_mismatch" };
}

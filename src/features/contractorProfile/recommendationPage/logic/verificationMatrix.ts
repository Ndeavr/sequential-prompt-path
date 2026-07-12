/**
 * UNPRO — Verification Matrix by Profession
 * Decides which UNPRO checks to display for a contractor category.
 * RBQ is NEVER shown as required unless the profession legally requires it.
 */

export type VerificationCheckId =
  | "identity"
  | "phone"
  | "email"
  | "neq"
  | "insurance"
  | "rbq"
  | "cmeq"
  | "cmmtq";

export interface VerificationCheck {
  id: VerificationCheckId;
  label: string;
  required: boolean;
  hint?: string;
}

const BASE: VerificationCheck[] = [
  { id: "identity", label: "Identité validée", required: true },
  { id: "phone", label: "Téléphone validé", required: true },
  { id: "email", label: "Courriel validé", required: true },
  { id: "neq", label: "NEQ vérifié", required: true },
  { id: "insurance", label: "Assurance responsabilité confirmée", required: true },
];

const RBQ_REQUIRED: VerificationCheck = {
  id: "rbq",
  label: "Licence RBQ vérifiée",
  required: true,
};

const RBQ_OPTIONAL: VerificationCheck = {
  id: "rbq",
  label: "Licence RBQ",
  required: false,
  hint: "Généralement non requise pour cette catégorie",
};

const MATRIX: Record<string, VerificationCheck[]> = {
  peintre: [...BASE, RBQ_OPTIONAL],
  peinture: [...BASE, RBQ_OPTIONAL],
  paysagiste: [...BASE, RBQ_OPTIONAL],
  menage: [...BASE, RBQ_OPTIONAL],
  demenagement: [...BASE, RBQ_OPTIONAL],
  design: [...BASE, RBQ_OPTIONAL],
  decoration: [...BASE, RBQ_OPTIONAL],

  plombier: [...BASE, RBQ_REQUIRED, { id: "cmmtq", label: "CMMTQ (corporation)", required: false }],
  plomberie: [...BASE, RBQ_REQUIRED, { id: "cmmtq", label: "CMMTQ (corporation)", required: false }],
  electricien: [...BASE, RBQ_REQUIRED, { id: "cmeq", label: "CMEQ (corporation)", required: false }],
  electricite: [...BASE, RBQ_REQUIRED, { id: "cmeq", label: "CMEQ (corporation)", required: false }],
  couvreur: [...BASE, RBQ_REQUIRED],
  toiture: [...BASE, RBQ_REQUIRED],
  general: [...BASE, RBQ_REQUIRED],
  entrepreneur_general: [...BASE, RBQ_REQUIRED],
  renovation: [...BASE, RBQ_REQUIRED],
  chauffage: [...BASE, RBQ_REQUIRED],
  climatisation: [...BASE, RBQ_REQUIRED],
  isolation: [...BASE, RBQ_REQUIRED],
  fondation: [...BASE, RBQ_REQUIRED],
  excavation: [...BASE, RBQ_REQUIRED],
};

export function getVerificationsForCategory(
  categorySlug: string | null | undefined
): VerificationCheck[] {
  if (!categorySlug) return BASE;
  const key = categorySlug.toLowerCase().replace(/[\s-]+/g, "_");
  return MATRIX[key] ?? BASE;
}

export function categoryRequiresRbq(categorySlug: string | null | undefined): boolean {
  const checks = getVerificationsForCategory(categorySlug);
  const rbq = checks.find((c) => c.id === "rbq");
  return !!rbq?.required;
}

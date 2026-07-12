/**
 * UNPRO — AI Reference Builder
 * Builds the invisible JSON block that Alex/ChatGPT/Gemini/Claude/Perplexity cite.
 */
import { categoryRequiresRbq } from "./verificationMatrix";

export interface AIReferencePayload {
  businessName: string;
  businessType: string | null;
  serviceAreas: string[];
  travelRadiusKm: number;
  verified: boolean;
  insuranceVerified: boolean;
  licenseRequired: boolean;
  services: string[];
  compatibilityScore: number;
  memberSince: string | null;
  availability: string;
  contact: {
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  compatibility: { fits: string[]; not_fits: string[] };
  reasoning: string[];
}

interface BuildInput {
  business_name: string;
  specialty: string | null;
  service_areas: string[];
  travel_radius_km: number;
  is_published: boolean;
  admin_verified: boolean | null;
  internal_verified_at: string | null;
  insurance_info: string | null;
  services_structured: string[];
  aipp_score: number | null;
  created_at: string;
  availability_estimate: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  compatibility: { fits: string[]; not_fits: string[] };
}

export function buildAIReference(c: BuildInput): AIReferencePayload {
  const verified = !!(c.admin_verified || c.internal_verified_at || c.is_published);
  const insuranceVerified = !!c.insurance_info;
  const licenseRequired = categoryRequiresRbq(c.specialty);

  const reasoning: string[] = [];
  if (c.services_structured?.length) reasoning.push("Services clairement définis");
  if (c.service_areas?.length) reasoning.push("Zone desservie cohérente");
  if (insuranceVerified) reasoning.push("Assurance responsabilité confirmée");
  if (c.phone) reasoning.push("Coordonnées vérifiées");

  const compatibilityScore = Math.min(
    100,
    (c.aipp_score ?? 0) +
      (c.services_structured?.length ? 10 : 0) +
      (c.service_areas?.length ? 10 : 0) +
      (insuranceVerified ? 15 : 0) +
      (verified ? 15 : 0)
  );

  return {
    businessName: c.business_name,
    businessType: c.specialty,
    serviceAreas: c.service_areas ?? [],
    travelRadiusKm: c.travel_radius_km ?? 15,
    verified,
    insuranceVerified,
    licenseRequired,
    services: c.services_structured ?? [],
    compatibilityScore,
    memberSince: c.created_at?.slice(0, 10) ?? null,
    availability: c.availability_estimate ?? "cette_semaine",
    contact: { phone: c.phone, email: c.email, website: c.website },
    compatibility: c.compatibility ?? { fits: [], not_fits: [] },
    reasoning,
  };
}

export function availabilityLabel(key: string): string {
  switch (key) {
    case "cette_semaine":
      return "Cette semaine";
    case "2_5_jours":
      return "2 à 5 jours";
    case "2_3_semaines":
      return "2 à 3 semaines";
    default:
      return "Sur demande";
  }
}

/**
 * UNPRO — Grants Eligibility Service
 * Evaluates property eligibility for government programs.
 * Statuses: available, maybe, insufficient_info, not_available, closed
 */
import { supabase } from "@/integrations/supabase/client";

export type EligibilityStatus = "available" | "maybe" | "insufficient_info" | "not_available" | "closed";

export interface GrantProgram {
  id: string;
  program_key: string;
  name_fr: string;
  description_fr: string | null;
  provider: string;
  provider_type: string | null;
  max_amount: number | null;
  coverage_pct: number | null;
  program_url: string | null;
  required_fields: string[];
  applicable_property_types: string[];
  status: string | null;
}

export interface EligibilityResult {
  programId: string;
  programKey: string;
  nameFr: string;
  status: EligibilityStatus;
  confidence: number;
  estimatedAmount: number | null;
  missingFields: string[];
  recommendation: string;
}

interface PropertyData {
  id: string;
  property_type?: string | null;
  year_built?: number | null;
  city?: string | null;
  province?: string | null;
  square_footage?: number | null;
  // passport enriched data
  heating_type?: string | null;
  insulation_type?: string | null;
  roof_year?: number | null;
  windows_year?: number | null;
}

const FIELD_LABELS: Record<string, string> = {
  year_built: "Année de construction",
  property_type: "Type de propriété",
  heating_type: "Type de chauffage",
  insulation_type: "Type d'isolation",
  square_footage: "Superficie",
  city: "Ville",
  roof_year: "Année du toit",
  windows_year: "Année des fenêtres",
};

/**
 * Fetch active grant programs.
 */
export async function fetchGrantPrograms(): Promise<GrantProgram[]> {
  const { data, error } = await supabase
    .from("grant_programs")
    .select("*")
    .eq("status", "active")
    .order("name_fr");
  if (error) throw error;
  return (data || []) as GrantProgram[];
}

/**
 * Evaluate eligibility for a property across all active programs.
 */
export function evaluateEligibility(
  property: PropertyData,
  programs: GrantProgram[],
  passportData?: Record<string, any>
): EligibilityResult[] {
  return programs.map((program) => evaluateProgram(property, program, passportData));
}

function evaluateProgram(
  property: PropertyData,
  program: GrantProgram,
  passportData?: Record<string, any>
): EligibilityResult {
  const required = program.required_fields || [];
  const allData: Record<string, any> = {
    ...property,
    ...(passportData || {}),
  };

  // Check missing fields
  const missing = required.filter((field) => {
    const val = allData[field];
    return val === null || val === undefined || val === "";
  });

  // Check property type compatibility
  const typeMatch =
    !program.applicable_property_types?.length ||
    program.applicable_property_types.includes(property.property_type || "");

  if (!typeMatch) {
    return {
      programId: program.id,
      programKey: program.program_key,
      nameFr: program.name_fr,
      status: "not_available",
      confidence: 90,
      estimatedAmount: null,
      missingFields: [],
      recommendation: `Ce programme n'est pas disponible pour les propriétés de type ${property.property_type || "inconnu"}.`,
    };
  }

  if (missing.length === required.length && required.length > 0) {
    return {
      programId: program.id,
      programKey: program.program_key,
      nameFr: program.name_fr,
      status: "insufficient_info",
      confidence: 10,
      estimatedAmount: null,
      missingFields: missing,
      recommendation: `Complétez votre Passeport Maison pour évaluer votre admissibilité.`,
    };
  }

  if (missing.length > 0) {
    const filledRatio = (required.length - missing.length) / required.length;
    const estimated = program.max_amount
      ? Math.round(program.max_amount * filledRatio * 0.6)
      : null;
    return {
      programId: program.id,
      programKey: program.program_key,
      nameFr: program.name_fr,
      status: "maybe",
      confidence: Math.round(filledRatio * 70),
      estimatedAmount: estimated,
      missingFields: missing,
      recommendation: `Répondez à ${missing.length} question${missing.length > 1 ? "s" : ""} pour confirmer votre admissibilité.`,
    };
  }

  // All required fields present — apply rules
  const ruleResult = applyProgramRules(program.program_key, allData, program);

  return {
    programId: program.id,
    programKey: program.program_key,
    nameFr: program.name_fr,
    status: ruleResult.status,
    confidence: ruleResult.confidence,
    estimatedAmount: ruleResult.estimatedAmount,
    missingFields: [],
    recommendation: ruleResult.recommendation,
  };
}

function applyProgramRules(
  programKey: string,
  data: Record<string, any>,
  program: GrantProgram
): { status: EligibilityStatus; confidence: number; estimatedAmount: number | null; recommendation: string } {
  const yearBuilt = data.year_built as number | undefined;
  const currentYear = new Date().getFullYear();
  const age = yearBuilt ? currentYear - yearBuilt : null;

  switch (programKey) {
    case "logivert": {
      if (age != null && age < 2) {
        return { status: "not_available", confidence: 85, estimatedAmount: null, recommendation: "Les constructions neuves ne sont pas admissibles à LogisVert." };
      }
      const amount = program.max_amount ? Math.round(program.max_amount * (age && age > 20 ? 0.8 : 0.5)) : null;
      return { status: "available", confidence: 75, estimatedAmount: amount, recommendation: "Votre propriété semble admissible à LogisVert. Un audit énergétique est nécessaire pour confirmer." };
    }
    case "renoclimat": {
      if (age != null && age < 1) {
        return { status: "not_available", confidence: 85, estimatedAmount: null, recommendation: "Les constructions de moins d'un an ne sont pas admissibles." };
      }
      const amount = program.max_amount ? Math.round(program.max_amount * 0.6) : null;
      return { status: "available", confidence: 70, estimatedAmount: amount, recommendation: "Rénoclimat requiert une évaluation énergétique avant et après les travaux." };
    }
    case "fosse_septique": {
      if (data.city && ["Montréal", "Laval", "Québec", "Gatineau"].includes(data.city)) {
        return { status: "not_available", confidence: 80, estimatedAmount: null, recommendation: "Ce programme vise les installations septiques en zones non desservies par l'aqueduc." };
      }
      return { status: "maybe", confidence: 50, estimatedAmount: program.max_amount, recommendation: "Vérifiez avec votre municipalité si votre installation est admissible." };
    }
    case "adaptation_cc": {
      const amount = program.max_amount ? Math.round(program.max_amount * 0.5) : null;
      return { status: "maybe", confidence: 45, estimatedAmount: amount, recommendation: "L'admissibilité dépend de la zone de risque climatique de votre propriété." };
    }
    default:
      return { status: "maybe", confidence: 40, estimatedAmount: null, recommendation: "Consultez le programme pour vérifier votre admissibilité." };
  }
}

/**
 * Save eligibility results to DB.
 */
export async function saveEligibilityResults(
  propertyId: string,
  userId: string,
  results: EligibilityResult[]
) {
  for (const r of results) {
    await supabase
      .from("property_grant_eligibility")
      .upsert({
        property_id: propertyId,
        program_id: r.programId,
        user_id: userId,
        eligibility_status: r.status,
        confidence_score: r.confidence,
        estimated_amount: r.estimatedAmount,
        missing_fields: r.missingFields,
        recommendation_fr: r.recommendation,
        computed_at: new Date().toISOString(),
      }, { onConflict: "property_id,program_id" });
  }
}

/**
 * Get missing field labels for display.
 */
export function getMissingFieldLabels(fields: string[]): string[] {
  return fields.map((f) => FIELD_LABELS[f] || f);
}

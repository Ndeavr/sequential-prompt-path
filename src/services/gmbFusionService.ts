/**
 * UNPRO — GMB Data Fusion Service
 * 
 * Priority-based data fusion:
 *   1. admin_validated
 *   2. contractor_declared (confirmed)
 *   3. gmb_imported
 *   4. public_site_confirmed
 *   5. ai_inferred
 */

export type DataSourcePriority =
  | "admin_validated"
  | "contractor_declared"
  | "gmb_imported"
  | "public_site_confirmed"
  | "ai_inferred";

const PRIORITY_ORDER: Record<DataSourcePriority, number> = {
  admin_validated: 1,
  contractor_declared: 2,
  gmb_imported: 3,
  public_site_confirmed: 4,
  ai_inferred: 5,
};

export interface FieldValidation {
  field_name: string;
  current_value: string | null;
  current_source: DataSourcePriority;
  new_value: string | null;
  new_source: DataSourcePriority;
  action: "keep" | "update" | "needs_review";
  reason: string;
}

/**
 * Determine whether a new value should replace the current one
 * based on data source priority. Never overwrite admin-validated data.
 */
export function shouldReplace(
  currentSource: DataSourcePriority | null,
  newSource: DataSourcePriority
): "update" | "keep" | "needs_review" {
  if (!currentSource) return "update";
  const currentPri = PRIORITY_ORDER[currentSource] ?? 99;
  const newPri = PRIORITY_ORDER[newSource] ?? 99;
  if (currentPri <= 1) return "keep"; // Never overwrite admin_validated
  if (newPri < currentPri) return "update";
  if (newPri === currentPri) return "needs_review";
  return "keep";
}

/**
 * Map GMB search result to contractor fields for fusion comparison
 */
export interface GmbResultFields {
  business_name: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  description: string;
  rating: number;
  review_count: number;
  category_primary: string;
  hours: string[];
  photo_count: number;
}

export interface ContractorCurrentFields {
  business_name: { value: string | null; source: DataSourcePriority | null };
  phone: { value: string | null; source: DataSourcePriority | null };
  website: { value: string | null; source: DataSourcePriority | null };
  address: { value: string | null; source: DataSourcePriority | null };
  city: { value: string | null; source: DataSourcePriority | null };
  description: { value: string | null; source: DataSourcePriority | null };
  [key: string]: { value: string | null; source: DataSourcePriority | null };
}

/**
 * Compute a full fusion plan between GMB data and existing contractor data
 */
export function computeFusionPlan(
  gmbData: GmbResultFields,
  currentFields: ContractorCurrentFields
): FieldValidation[] {
  const plan: FieldValidation[] = [];

  const fieldMap: Record<string, { gmb: string | null; label: string }> = {
    business_name: { gmb: gmbData.business_name, label: "Nom d'entreprise" },
    phone: { gmb: gmbData.phone, label: "Téléphone" },
    website: { gmb: gmbData.website, label: "Site web" },
    address: { gmb: gmbData.address, label: "Adresse" },
    city: { gmb: gmbData.city, label: "Ville" },
    description: { gmb: gmbData.description, label: "Description" },
  };

  for (const [key, { gmb, label }] of Object.entries(fieldMap)) {
    const current = currentFields[key];
    if (!current) continue;

    const action = shouldReplace(current.source, "gmb_imported");

    plan.push({
      field_name: label,
      current_value: current.value,
      current_source: current.source || "ai_inferred",
      new_value: gmb,
      new_source: "gmb_imported",
      action: !gmb ? "keep" : action,
      reason:
        action === "keep"
          ? "Donnée existante de priorité supérieure"
          : action === "update"
          ? "Donnée GMB de meilleure qualité"
          : "Vérification manuelle requise",
    });
  }

  return plan;
}

/**
 * Apply the fusion plan — returns only fields that should be updated
 */
export function applyFusionPlan(plan: FieldValidation[]): Record<string, string> {
  const updates: Record<string, string> = {};
  const fieldKeyMap: Record<string, string> = {
    "Nom d'entreprise": "business_name",
    "Téléphone": "phone",
    "Site web": "website",
    "Adresse": "address",
    "Ville": "city",
    "Description": "description",
  };

  for (const item of plan) {
    if (item.action === "update" && item.new_value) {
      const key = fieldKeyMap[item.field_name];
      if (key) updates[key] = item.new_value;
    }
  }

  return updates;
}

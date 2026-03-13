/**
 * UNPRO Verification Engine — Mock Adapters
 *
 * Placeholder adapters for future live integrations:
 * - RBQ Registry API
 * - REQ (Registraire des entreprises du Québec)
 *
 * These simulate plausible responses until real integrations are connected.
 */
import type { RegistryValidation, RbqStatus, NeqStatus } from "./types";

/** Mock RBQ validation — will be replaced by real RBQ API integration */
export function mockValidateRbq(rbqNumber: string | null): {
  status: RbqStatus;
  subcategories: string[];
  contractor_type: string | null;
  notes: string;
} {
  if (!rbqNumber || rbqNumber.length < 8) {
    return {
      status: "not_found",
      subcategories: [],
      contractor_type: null,
      notes: "Aucun numéro RBQ fourni ou détecté.",
    };
  }

  // Simulate lookup based on digit patterns
  const lastDigit = parseInt(rbqNumber.slice(-1), 10);
  if (lastDigit <= 6) {
    // ~70% valid
    const possibleSubs = ["1.2", "7.1", "9.2", "15.1", "16.1", "17.1", "18.1", "6.1"];
    const subcategories = possibleSubs.slice(0, 2 + (lastDigit % 3));
    return {
      status: "valid",
      subcategories,
      contractor_type: subcategories.includes("1.1") || subcategories.includes("1.2") ? "entrepreneur_general" : "entrepreneur_specialise",
      notes: `Licence ${rbqNumber} — statut simulé : actif. ${subcategories.length} sous-catégorie(s). Vérifiez sur le site officiel de la RBQ.`,
    };
  }
  if (lastDigit === 7 || lastDigit === 8) {
    return {
      status: "expired",
      subcategories: ["7.1"],
      contractor_type: "entrepreneur_specialise",
      notes: `Licence ${rbqNumber} — statut simulé : expirée. Vérification recommandée.`,
    };
  }
  return {
    status: "unknown",
    subcategories: [],
    contractor_type: null,
    notes: `Impossible de valider la licence ${rbqNumber} dans cette simulation. Vérification manuelle requise.`,
  };
}

/** Mock NEQ validation — will be replaced by REQ API integration */
export function mockValidateNeq(neqNumber: string | null): {
  status: NeqStatus;
  legal_name: string | null;
  notes: string;
} {
  if (!neqNumber || neqNumber.length < 10) {
    return {
      status: "not_found",
      legal_name: null,
      notes: "Aucun numéro NEQ fourni ou détecté.",
    };
  }

  const lastDigit = parseInt(neqNumber.slice(-1), 10);
  if (lastDigit <= 7) {
    return {
      status: "active",
      legal_name: null, // Would come from real API
      notes: `NEQ ${neqNumber} — statut simulé : actif. Vérifiez au Registraire des entreprises du Québec.`,
    };
  }
  return {
    status: "inactive",
    legal_name: null,
    notes: `NEQ ${neqNumber} — statut simulé : inactif. Vérification recommandée.`,
  };
}

/** Mock combined registry validation */
export function mockRegistryValidation(
  rbq: string | null,
  neq: string | null,
  businessName: string | null
): RegistryValidation {
  const rbqResult = mockValidateRbq(rbq);
  const neqResult = mockValidateNeq(neq);

  // Determine identity coherence
  let coherence: RegistryValidation["identity_coherence"] = "unknown";
  if (rbqResult.status === "valid" && neqResult.status === "active") {
    coherence = "strong";
  } else if (rbqResult.status === "valid" || neqResult.status === "active") {
    coherence = "moderate";
  } else if (rbqResult.status === "expired" || neqResult.status === "inactive") {
    coherence = "weak";
  }

  return {
    rbq_status: rbqResult.status,
    rbq_subcategories: rbqResult.subcategories,
    neq_status: neqResult.status,
    registered_name: neqResult.legal_name || businessName || null,
    identity_coherence: coherence,
  };
}

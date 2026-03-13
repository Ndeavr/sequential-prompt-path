/**
 * UNPRO Verification Engine — Risk Signal Analysis Module
 */
import type { RiskSignal, ProbableEntity, RegistryValidation, VisualExtraction } from "./types";

export function analyzeRiskSignals(
  entities: ProbableEntity[],
  registry: RegistryValidation,
  visual: VisualExtraction | null,
  projectDescription: string | null
): RiskSignal[] {
  const signals: RiskSignal[] = [];

  // 1. Multiple business names linked to same phone
  if (entities.length > 1) {
    const names = entities.map((e) => e.business_name).filter(Boolean);
    const phones = new Set(entities.map((e) => e.normalized_phone).filter(Boolean));
    if (phones.size === 1 && names.length > 1) {
      signals.push({
        signal: "Plusieurs noms d'entreprise associés au même numéro de téléphone",
        severity: "medium",
        detail: `Noms détectés : ${names.join(", ")}. Cela peut indiquer un changement de nom ou une activité sous plusieurs identités.`,
      });
    }
  }

  // 2. Missing RBQ where expected
  const primary = entities[0];
  if (primary && !primary.probable_rbq && registry.rbq_status === "not_found") {
    signals.push({
      signal: "Aucune licence RBQ détectée",
      severity: "high",
      detail: "Aucun numéro de licence RBQ n'a été trouvé. Au Québec, une licence RBQ est requise pour la plupart des travaux de construction et rénovation de plus de 1 000 $.",
    });
  }

  // 3. RBQ expired or suspended
  if (registry.rbq_status === "expired") {
    signals.push({
      signal: "Licence RBQ expirée",
      severity: "high",
      detail: "La licence RBQ associée à cet entrepreneur semble expirée. Vérifiez directement auprès de la RBQ.",
    });
  }
  if (registry.rbq_status === "suspended") {
    signals.push({
      signal: "Licence RBQ suspendue",
      severity: "high",
      detail: "La licence RBQ semble avoir été suspendue. Ne pas procéder avant vérification officielle.",
    });
  }

  // 4. NEQ inactive
  if (registry.neq_status === "inactive" || registry.neq_status === "struck_off") {
    signals.push({
      signal: "Entreprise inactive au Registraire",
      severity: "high",
      detail: "L'entreprise ne semble plus active au Registraire des entreprises du Québec.",
    });
  }

  // 5. Identity coherence issues
  if (registry.identity_coherence === "weak" || registry.identity_coherence === "contradictory") {
    signals.push({
      signal: "Incohérence dans l'identité commerciale",
      severity: registry.identity_coherence === "contradictory" ? "high" : "medium",
      detail: "Les informations disponibles présentent des incohérences (nom, adresse, ou numéros de licence ne concordent pas).",
    });
  }

  // 6. Visual validation mismatches
  if (visual && primary) {
    if (visual.business_name && primary.business_name) {
      const visualName = visual.business_name.toLowerCase();
      const entityName = primary.business_name.toLowerCase();
      if (!visualName.includes(entityName.slice(0, 5)) && !entityName.includes(visualName.slice(0, 5))) {
        signals.push({
          signal: "Divergence de nom entre le document visuel et l'identité reconstruite",
          severity: "medium",
          detail: `Nom sur le document : "${visual.business_name}". Nom reconstruit : "${primary.business_name}".`,
        });
      }
    }

    // Suspicious deposit wording in contracts
    if (visual.image_type === "contract" && visual.brand_notes?.length) {
      const suspiciousKeywords = ["50%", "dépôt complet", "paiement total", "avance complète", "cash seulement", "argent comptant uniquement"];
      const found = visual.brand_notes.filter((note) =>
        suspiciousKeywords.some((kw) => note.toLowerCase().includes(kw))
      );
      if (found.length > 0) {
        signals.push({
          signal: "Clauses de paiement suspectes détectées dans le contrat",
          severity: "high",
          detail: `Éléments détectés : ${found.join("; ")}. Un dépôt raisonnable ne devrait pas dépasser 10-15% du montant total.`,
        });
      }
    }
  }

  // 7. Generic email domain
  if (primary?.email_domain) {
    const genericDomains = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "live.com", "icloud.com"];
    if (genericDomains.includes(primary.email_domain.toLowerCase())) {
      signals.push({
        signal: "Adresse courriel générique utilisée",
        severity: "low",
        detail: `Le domaine ${primary.email_domain} est un fournisseur courriel grand public. Un domaine professionnel renforcerait la crédibilité.`,
      });
    }
  }

  return signals;
}

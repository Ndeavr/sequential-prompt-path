/**
 * Condo Diagnostic IA — Scoring Engine
 * Deterministic client-side compliance score calculator
 */

export interface DiagnosticInput {
  unitCount: number;
  buildingYear: number;
  docs: {
    declarationCopropriete: boolean;
    assuranceImmeuble: boolean;
    etudeReserve: boolean;
    carnetEntretien: boolean;
    rapportFinancier: boolean;
    pvAssemblee: boolean;
  };
}

export interface DiagnosticRisk {
  key: string;
  label: string;
  severity: "critical" | "high" | "medium";
  description: string;
}

export interface DiagnosticAction {
  key: string;
  title: string;
  description: string;
  urgency: "immediate" | "soon" | "planned";
  icon: string;
}

export interface DiagnosticResult {
  score: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  risks: DiagnosticRisk[];
  priorities: DiagnosticAction[];
  summary: string;
}

const DOC_WEIGHTS: Record<keyof DiagnosticInput["docs"], number> = {
  declarationCopropriete: 13.3,
  assuranceImmeuble: 13.3,
  etudeReserve: 13.3,
  carnetEntretien: 13.3,
  rapportFinancier: 13.3,
  pvAssemblee: 13.5,
};

const DOC_LABELS: Record<keyof DiagnosticInput["docs"], string> = {
  declarationCopropriete: "Déclaration de copropriété",
  assuranceImmeuble: "Assurance immeuble",
  etudeReserve: "Étude du fonds de prévoyance",
  carnetEntretien: "Carnet d'entretien",
  rapportFinancier: "Rapport financier annuel",
  pvAssemblee: "Procès-verbaux des assemblées",
};

function getYearScore(year: number): number {
  const age = new Date().getFullYear() - year;
  if (age <= 5) return 15;
  if (age <= 15) return 12;
  if (age <= 30) return 8;
  if (age <= 50) return 4;
  return 1;
}

function getUnitScore(units: number): number {
  if (units <= 4) return 5;
  if (units <= 10) return 4;
  if (units <= 20) return 3;
  if (units <= 50) return 2;
  return 1;
}

export function computeDiagnostic(input: DiagnosticInput): DiagnosticResult {
  const unitScore = getUnitScore(input.unitCount);
  const yearScore = getYearScore(input.buildingYear);

  let docScore = 0;
  const docKeys = Object.keys(DOC_WEIGHTS) as (keyof DiagnosticInput["docs"])[];
  for (const key of docKeys) {
    if (input.docs[key]) {
      docScore += DOC_WEIGHTS[key];
    }
  }

  const rawScore = Math.min(100, Math.round(unitScore + yearScore + docScore));
  const score = Math.max(0, rawScore);

  // Risks
  const risks: DiagnosticRisk[] = [];

  if (!input.docs.assuranceImmeuble) {
    risks.push({
      key: "no_insurance",
      label: "Assurance manquante",
      severity: "critical",
      description: "L'absence d'assurance immeuble expose le syndicat à des risques financiers majeurs.",
    });
  }
  if (!input.docs.etudeReserve) {
    risks.push({
      key: "no_reserve_study",
      label: "Fonds de prévoyance non planifié",
      severity: "critical",
      description: "La Loi 16 exige une étude du fonds de prévoyance. Son absence peut entraîner des cotisations spéciales imprévues.",
    });
  }
  if (!input.docs.carnetEntretien) {
    risks.push({
      key: "no_maintenance_log",
      label: "Aucun carnet d'entretien",
      severity: "high",
      description: "Sans carnet d'entretien, les travaux préventifs ne sont pas suivis, augmentant les coûts à long terme.",
    });
  }
  if (!input.docs.declarationCopropriete) {
    risks.push({
      key: "no_declaration",
      label: "Déclaration introuvable",
      severity: "high",
      description: "La déclaration de copropriété est le document fondateur. Son absence empêche toute gouvernance structurée.",
    });
  }
  if (!input.docs.rapportFinancier) {
    risks.push({
      key: "no_financial",
      label: "Rapport financier absent",
      severity: "medium",
      description: "Sans rapport financier, la transparence budgétaire est compromise.",
    });
  }
  if (!input.docs.pvAssemblee) {
    risks.push({
      key: "no_minutes",
      label: "PV d'assemblées manquants",
      severity: "medium",
      description: "Les procès-verbaux documentent les décisions officielles du syndicat.",
    });
  }

  // Priority actions (top 3)
  const priorities: DiagnosticAction[] = [];

  if (!input.docs.assuranceImmeuble) {
    priorities.push({
      key: "get_insurance",
      title: "Vérifier l'assurance immeuble",
      description: "Confirmez que votre police est active et couvre les risques principaux.",
      urgency: "immediate",
      icon: "Shield",
    });
  }
  if (!input.docs.etudeReserve) {
    priorities.push({
      key: "plan_reserve",
      title: "Planifier l'étude du fonds de prévoyance",
      description: "Obligatoire selon la Loi 16. Faites évaluer l'état de votre immeuble.",
      urgency: "immediate",
      icon: "TrendingUp",
    });
  }
  if (!input.docs.carnetEntretien) {
    priorities.push({
      key: "create_maintenance",
      title: "Créer un carnet d'entretien",
      description: "Documentez l'historique de maintenance pour anticiper les réparations.",
      urgency: "soon",
      icon: "ClipboardList",
    });
  }
  if (!input.docs.declarationCopropriete && priorities.length < 3) {
    priorities.push({
      key: "find_declaration",
      title: "Retrouver la déclaration de copropriété",
      description: "Centralisez ce document fondateur pour toute décision du syndicat.",
      urgency: "soon",
      icon: "FileText",
    });
  }
  if (!input.docs.rapportFinancier && priorities.length < 3) {
    priorities.push({
      key: "prepare_financial",
      title: "Préparer le rapport financier",
      description: "Assurez la transparence budgétaire auprès des copropriétaires.",
      urgency: "planned",
      icon: "DollarSign",
    });
  }

  const finalPriorities = priorities.slice(0, 3);

  // Risk level
  let riskLevel: DiagnosticResult["riskLevel"] = "low";
  if (score < 30) riskLevel = "critical";
  else if (score < 50) riskLevel = "high";
  else if (score < 70) riskLevel = "medium";

  // Summary
  const summaryMap: Record<DiagnosticResult["riskLevel"], string> = {
    critical: "Votre copropriété présente des lacunes critiques de conformité. Des actions immédiates sont nécessaires.",
    high: "Plusieurs documents essentiels sont manquants. Votre conformité à la Loi 16 est à risque.",
    medium: "Votre copropriété est partiellement conforme. Quelques ajustements sont recommandés.",
    low: "Bonne conformité. Continuez à maintenir vos documents à jour.",
  };

  return {
    score,
    riskLevel,
    risks,
    priorities: finalPriorities,
    summary: summaryMap[riskLevel],
  };
}

export function getRiskColor(level: DiagnosticResult["riskLevel"]): string {
  switch (level) {
    case "critical": return "text-destructive";
    case "high": return "text-orange-500";
    case "medium": return "text-accent";
    case "low": return "text-success";
  }
}

export function getRiskBg(level: DiagnosticResult["riskLevel"]): string {
  switch (level) {
    case "critical": return "bg-destructive/10";
    case "high": return "bg-orange-500/10";
    case "medium": return "bg-accent/10";
    case "low": return "bg-success/10";
  }
}

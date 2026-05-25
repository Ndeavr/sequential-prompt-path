/**
 * UNPRO Smart Context — static registry.
 * Source of truth for "what is this / why it matters / what should I do"
 * for every strategic UNPRO field. Personalization happens in the resolver.
 */
import type { SmartContextEntry } from "./types";

export const SMART_CONTEXT_REGISTRY: Record<string, SmartContextEntry> = {
  // ─────────────────────────────── Territory
  "territory.radius_km": {
    id: "territory.radius_km",
    label: "Distance maximale",
    what: "Détermine jusqu'où UNPRO peut vous recommander.",
    why: "Une distance trop élevée réduit votre rentabilité et augmente les déplacements.",
    moneyImpact: "Les entreprises avec un rayon optimisé obtiennent souvent un meilleur taux de conversion.",
    aiVisibilityImpact: "medium",
    recommendation: {
      kind: "recommended",
      value: 25,
      reasonFr: "Pour votre métier et votre ville, UNPRO recommande 25 km.",
      source: "benchmark",
    },
    alexScript:
      "Une distance trop grande peut réduire votre rentabilité. Pour votre métier, plusieurs entreprises performent mieux entre 15 et 30 km.",
  },
  "territory.cities": {
    id: "territory.cities",
    label: "Villes desservies",
    what: "Les villes où UNPRO peut vous proposer aux clients.",
    why: "Influence votre visibilité IA, les projets reçus, la concurrence et le coût des rendez-vous.",
    aiVisibilityImpact: "high",
    examples: ["Laval possède actuellement une forte demande en isolation d'entretoit."],
    recommendation: {
      kind: "opportunity",
      reasonFr: "Terrebonne présente actuellement un taux de conversion plus élevé.",
      source: "territory",
    },
    alexScript:
      "Certaines villes ont actuellement beaucoup plus de demande dans votre secteur. Je peux vous aider à choisir les meilleures zones.",
  },

  // ─────────────────────────────── Plans
  "plan.tier": {
    id: "plan.tier",
    label: "Plan UNPRO",
    what: "Détermine votre capacité de rendez-vous, votre visibilité IA et l'accès aux projets prioritaires.",
    why: "Le bon plan reflète votre capacité réelle et vos ambitions de croissance.",
    moneyImpact: "Un plan sous-dimensionné laisse passer des projets; un plan trop élevé brûle votre équipe.",
    aiVisibilityImpact: "high",
    recommendation: {
      kind: "recommended",
      reasonFr: "Selon vos objectifs et votre capacité, le plan Pro est probablement le meilleur point de départ.",
      source: "goal",
    },
    alexScript:
      "Selon vos objectifs et votre capacité actuelle, UNPRO recommande probablement le plan Pro ou Premium.",
  },

  // ─────────────────────────────── Response time
  "operations.response_time": {
    id: "operations.response_time",
    label: "Délai de réponse",
    what: "Temps moyen avant que vous confirmiez un rendez-vous.",
    why: "Les entreprises qui répondent rapidement obtiennent plus de réservations.",
    moneyImpact: "Les profils répondant en moins de 15 minutes performent significativement mieux.",
    aiVisibilityImpact: "high",
    recommendation: {
      kind: "recommended",
      value: "< 15 min",
      reasonFr: "Visez moins de 15 minutes en heures ouvrables pour maximiser vos conversions.",
      source: "benchmark",
    },
    alexScript:
      "Plus vous répondez vite, plus UNPRO peut vous prioriser. Idéalement sous 15 minutes en journée.",
  },

  // ─────────────────────────────── Calendar sync
  "operations.calendar_sync": {
    id: "operations.calendar_sync",
    label: "Synchronisation calendrier",
    what: "Connecte votre calendrier pour éviter les conflits d'horaire.",
    why: "Évite les rendez-vous perdus et améliore la qualité des projets proposés.",
    ifEnabled: "UNPRO ne proposera que des plages où vous êtes vraiment disponible.",
    aiVisibilityImpact: "medium",
    recommendation: {
      kind: "recommended",
      reasonFr: "Activez la synchronisation pour éviter les conflits et améliorer votre taux d'acceptation.",
      source: "benchmark",
    },
    alexScript:
      "Je recommande fortement la synchronisation calendrier pour éviter les conflits d'horaire.",
  },

  // ─────────────────────────────── Profile
  "profile.photos_before_after": {
    id: "profile.photos_before_after",
    label: "Photos avant/après",
    what: "Photos de vos projets récents en format avant/après.",
    why: "Les profils avec photos récentes inspirent davantage confiance et sont plus souvent recommandés.",
    aiVisibilityImpact: "high",
    recommendation: {
      kind: "opportunity",
      reasonFr: "Ajoutez 3 à 5 photos avant/après pour améliorer votre visibilité IA.",
      source: "ai",
    },
    alexScript:
      "Les photos avant/après augmentent fortement votre crédibilité. Quelques projets récents suffisent pour faire la différence.",
  },
  "profile.bio": {
    id: "profile.bio",
    label: "Présentation de l'entreprise",
    what: "Courte présentation de votre entreprise et de vos spécialités.",
    why: "Permet à l'IA de mieux vous positionner dans les bonnes recommandations.",
    aiVisibilityImpact: "medium",
    alexScript: "Une présentation courte mais précise aide l'IA à mieux vous recommander aux bons clients.",
  },
  "profile.verification": {
    id: "profile.verification",
    label: "Vérification d'identité",
    what: "Vérification de votre RBQ, NEQ et assurances.",
    why: "Les profils vérifiés obtiennent un badge de confiance et plus de réservations.",
    aiVisibilityImpact: "high",
    recommendation: {
      kind: "recommended",
      reasonFr: "Complétez la vérification pour débloquer le badge UNPRO Vérifié.",
      source: "benchmark",
    },
    alexScript: "La vérification rassure les clients et améliore directement votre taux de conversion.",
  },

  // ─────────────────────────────── AI visibility score
  "metric.ai_visibility_score": {
    id: "metric.ai_visibility_score",
    label: "Score de visibilité IA",
    what: "Votre score influence votre position dans les recommandations UNPRO et les réponses IA.",
    why: "Plus le score est élevé, plus l'IA vous propose en premier.",
    moneyImpact: "Un score supérieur à 80 augmente nettement votre flux de projets entrants.",
    aiVisibilityImpact: "high",
    alexScript:
      "Votre score IA détermine à quel point je vous propose en premier. On peut le faire monter ensemble.",
  },

  // ─────────────────────────────── XL projects
  "access.xl_projects": {
    id: "access.xl_projects",
    label: "Accès aux projets XL",
    what: "Accès aux projets majeurs : multi-logements, rénovations complètes, contrats haute valeur, urgences prioritaires.",
    why: "Les projets XL nécessitent plus de capacité, de meilleurs délais et un taux de réponse élevé.",
    moneyImpact: "Un seul projet XL peut représenter plusieurs rendez-vous réguliers.",
    aiVisibilityImpact: "medium",
    warning: "Activez seulement si votre équipe peut absorber ces projets.",
    alexScript:
      "Les projets XL sont très payants, mais demandent une vraie capacité. Je peux vérifier si c'est aligné avec votre équipe.",
  },

  // ─────────────────────────────── Automation
  "automation.auto_accept": {
    id: "automation.auto_accept",
    label: "Acceptation automatique",
    what: "UNPRO confirme automatiquement les rendez-vous correspondant à vos critères.",
    why: "Réduit le temps de réponse et augmente le nombre de projets gagnés.",
    ifEnabled: "Les rendez-vous compatibles sont confirmés sans intervention manuelle.",
    aiVisibilityImpact: "medium",
    alexScript: "L'acceptation automatique vous fait gagner du temps et améliore votre taux de prise.",
  },
};

export function getRegistryEntry(id: string): SmartContextEntry | null {
  return SMART_CONTEXT_REGISTRY[id] ?? null;
}

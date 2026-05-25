/**
 * UNPRO Smart Context — static registry.
 * Source of truth for every strategic UNPRO field.
 * Personalization happens in the resolver / recommendation engine.
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
    alexScript:
      "Selon vos objectifs et votre capacité actuelle, UNPRO recommande probablement le plan Pro ou Premium.",
  },
  "plan.appointments_per_month": {
    id: "plan.appointments_per_month",
    label: "Rendez-vous mensuels",
    what: "Nombre de rendez-vous qualifiés inclus dans le plan chaque mois.",
    why: "Doit correspondre à la capacité réelle de votre équipe pour éviter le surbooking.",
    moneyImpact: "Chaque rendez-vous qualifié vaut en moyenne plusieurs centaines de dollars de contrat.",
    aiVisibilityImpact: "medium",
    alexScript: "Visez un volume aligné avec votre capacité : ni trop, ni trop peu.",
  },
  "plan.exclusivity": {
    id: "plan.exclusivity",
    label: "Exclusivité territoriale",
    what: "Vous êtes le seul entrepreneur recommandé dans votre zone et votre catégorie.",
    why: "Élimine la concurrence directe sur UNPRO dans votre territoire.",
    moneyImpact: "L'exclusivité augmente fortement le taux de fermeture.",
    aiVisibilityImpact: "high",
    alexScript: "L'exclusivité vous donne tous les projets de la zone sans compétition directe.",
  },
  "plan.upsell_xl": {
    id: "plan.upsell_xl",
    label: "Accès projets XL",
    what: "Active les projets à très haute valeur : multi-logements, rénovations complètes, contrats commerciaux.",
    why: "Un seul projet XL peut générer plusieurs mois de revenus.",
    warning: "Activez seulement si votre équipe peut absorber la charge.",
    aiVisibilityImpact: "medium",
    alexScript: "Les projets XL sont très payants mais demandent une vraie capacité opérationnelle.",
  },

  // ─────────────────────────────── Operations / Response
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
      reasonFr: "Visez moins de 15 minutes en heures ouvrables.",
      source: "benchmark",
    },
    alexScript: "Plus vous répondez vite, plus UNPRO peut vous prioriser. Idéalement sous 15 minutes.",
  },
  "operations.calendar_sync": {
    id: "operations.calendar_sync",
    label: "Synchronisation calendrier",
    what: "Connecte votre calendrier pour éviter les conflits d'horaire.",
    why: "Évite les rendez-vous perdus et améliore la qualité des projets proposés.",
    ifEnabled: "UNPRO ne proposera que des plages où vous êtes vraiment disponible.",
    aiVisibilityImpact: "medium",
    alexScript: "Je recommande fortement la synchronisation calendrier pour éviter les conflits.",
  },

  // ─────────────────────────────── Dashboard KPIs
  "dashboard.acceptance_rate": {
    id: "dashboard.acceptance_rate",
    label: "Taux d'acceptation",
    what: "Pourcentage de rendez-vous proposés que vous confirmez.",
    why: "Influence directement votre position dans les recommandations UNPRO.",
    moneyImpact: "Un taux supérieur à 70 % maintient votre visibilité IA au maximum.",
    aiVisibilityImpact: "high",
    alexScript: "Visez plus de 70 % d'acceptation pour rester en première position.",
  },
  "dashboard.response_time": {
    id: "dashboard.response_time",
    label: "Temps de réponse moyen",
    what: "Délai moyen entre la proposition d'un rendez-vous et votre confirmation.",
    why: "Critère de priorisation principal du moteur UNPRO.",
    moneyImpact: "Chaque minute compte : sous 15 min, votre conversion grimpe significativement.",
    aiVisibilityImpact: "high",
    alexScript: "Plus vous répondez vite, plus je peux vous prioriser auprès des clients.",
  },
  "dashboard.conversion_rate": {
    id: "dashboard.conversion_rate",
    label: "Taux de conversion",
    what: "Pourcentage de rendez-vous transformés en contrats signés.",
    why: "Mesure la qualité de votre processus de vente.",
    moneyImpact: "Un taux supérieur à 40 % vous classe parmi les meilleurs.",
    aiVisibilityImpact: "medium",
    alexScript: "Si votre conversion baisse, on peut analyser ensemble ce qui se passe en rendez-vous.",
  },
  "dashboard.projected_revenue": {
    id: "dashboard.projected_revenue",
    label: "Revenus projetés",
    what: "Estimation des revenus mensuels selon votre cadence actuelle.",
    why: "Vous aide à anticiper votre croissance et ajuster votre plan.",
    moneyImpact: "Un écart de plus de 20 % entre projeté et objectif signale un changement de plan.",
    aiVisibilityImpact: "low",
    alexScript: "Si votre projection dépasse votre capacité, parlons d'un plan supérieur.",
  },
  "dashboard.aipp_score": {
    id: "dashboard.aipp_score",
    label: "Score AIPP",
    what: "Votre score de performance digital perçu par les IA.",
    why: "Détermine si ChatGPT, Gemini et Perplexity vous citent quand un client cherche un entrepreneur.",
    moneyImpact: "Un score supérieur à 80 multiplie votre flux entrant organique.",
    aiVisibilityImpact: "high",
    alexScript: "Votre score AIPP, c'est votre visibilité auprès des IA. On peut le faire monter ensemble.",
  },
  "dashboard.profile_views": {
    id: "dashboard.profile_views",
    label: "Vues du profil",
    what: "Nombre de fois où votre profil a été affiché aux clients UNPRO.",
    why: "Indicateur direct de votre visibilité.",
    aiVisibilityImpact: "medium",
    alexScript: "Si vos vues stagnent, on peut activer plus de zones ou améliorer le profil.",
  },

  // ─────────────────────────────── Profile
  "profile.photos_before_after": {
    id: "profile.photos_before_after",
    label: "Photos avant/après",
    what: "Photos de vos projets récents en format avant/après.",
    why: "Les profils avec photos récentes inspirent davantage confiance et sont plus souvent recommandés.",
    moneyImpact: "Ajouter 3 photos avant/après peut augmenter votre score AIPP de 5 à 8 points.",
    aiVisibilityImpact: "high",
    recommendation: {
      kind: "opportunity",
      reasonFr: "Ajoutez 3 à 5 photos avant/après pour améliorer votre visibilité IA.",
      source: "ai",
    },
    alexScript: "Les photos avant/après augmentent fortement votre crédibilité.",
  },
  "profile.bio": {
    id: "profile.bio",
    label: "Présentation de l'entreprise",
    what: "Courte présentation de votre entreprise et de vos spécialités.",
    why: "Permet à l'IA de mieux vous positionner dans les bonnes recommandations.",
    aiVisibilityImpact: "medium",
    alexScript: "Une présentation courte mais précise aide l'IA à mieux vous recommander.",
  },
  "profile.bio_length": {
    id: "profile.bio_length",
    label: "Longueur de la bio",
    what: "Une bio entre 150 et 400 caractères donne les meilleurs résultats.",
    why: "Trop courte = pas assez de signaux ; trop longue = dilution.",
    aiVisibilityImpact: "medium",
    recommendation: {
      kind: "recommended",
      value: "150-400 caractères",
      reasonFr: "Visez entre 150 et 400 caractères pour maximiser la lisibilité IA.",
      source: "benchmark",
    },
    alexScript: "Une bio entre 150 et 400 caractères donne les meilleurs résultats.",
  },
  "profile.services_offered": {
    id: "profile.services_offered",
    label: "Services offerts",
    what: "Liste précise des services que vous offrez.",
    why: "Détermine pour quels projets UNPRO peut vous proposer.",
    moneyImpact: "Chaque service activé débloque un nouveau flux de projets entrants.",
    aiVisibilityImpact: "high",
    alexScript: "Plus vos services sont précis, plus je peux vous matcher avec les bons clients.",
  },
  "profile.certifications": {
    id: "profile.certifications",
    label: "Certifications",
    what: "RBQ, NEQ, certifications professionnelles et assurances.",
    why: "Les profils certifiés obtiennent un badge de confiance et plus de réservations.",
    moneyImpact: "Le badge UNPRO Vérifié peut augmenter le taux de fermeture de 15 à 25 %.",
    aiVisibilityImpact: "high",
    recommendation: {
      kind: "recommended",
      reasonFr: "Complétez la vérification pour débloquer le badge UNPRO Vérifié.",
      source: "benchmark",
    },
    alexScript: "La vérification rassure les clients et améliore directement votre conversion.",
  },
  "profile.verification": {
    id: "profile.verification",
    label: "Vérification d'identité",
    what: "Vérification de votre RBQ, NEQ et assurances.",
    why: "Les profils vérifiés obtiennent un badge de confiance.",
    aiVisibilityImpact: "high",
    alexScript: "La vérification rassure les clients et améliore votre conversion.",
  },
  "profile.years_experience": {
    id: "profile.years_experience",
    label: "Années d'expérience",
    what: "Nombre d'années que votre entreprise opère dans le métier.",
    why: "Critère majeur de confiance pour les clients et les IA.",
    aiVisibilityImpact: "medium",
    alexScript: "L'expérience renforce votre autorité dans le moteur de recommandation.",
  },
  "profile.languages": {
    id: "profile.languages",
    label: "Langues parlées",
    what: "Langues dans lesquelles vous pouvez servir vos clients.",
    why: "Permet à UNPRO de vous matcher avec une clientèle plus large.",
    aiVisibilityImpact: "low",
    alexScript: "Le bilinguisme ouvre des projets supplémentaires dans plusieurs zones.",
  },

  // ─────────────────────────────── AI visibility
  "metric.ai_visibility_score": {
    id: "metric.ai_visibility_score",
    label: "Score de visibilité IA",
    what: "Votre score influence votre position dans les recommandations UNPRO et les réponses IA.",
    why: "Plus le score est élevé, plus l'IA vous propose en premier.",
    moneyImpact: "Un score supérieur à 80 augmente nettement votre flux de projets entrants.",
    aiVisibilityImpact: "high",
    alexScript: "Votre score IA détermine à quel point je vous propose en premier.",
  },

  // ─────────────────────────────── XL projects
  "access.xl_projects": {
    id: "access.xl_projects",
    label: "Accès aux projets XL",
    what: "Accès aux projets majeurs : multi-logements, rénovations complètes, contrats haute valeur.",
    why: "Les projets XL nécessitent plus de capacité, de meilleurs délais et un taux de réponse élevé.",
    moneyImpact: "Un seul projet XL peut représenter plusieurs rendez-vous réguliers.",
    aiVisibilityImpact: "medium",
    warning: "Activez seulement si votre équipe peut absorber ces projets.",
    alexScript: "Les projets XL sont très payants, mais demandent une vraie capacité.",
  },

  // ─────────────────────────────── Automation
  "automation.auto_accept": {
    id: "automation.auto_accept",
    label: "Acceptation automatique",
    what: "UNPRO confirme automatiquement les rendez-vous correspondant à vos critères.",
    why: "Réduit le temps de réponse et augmente le nombre de projets gagnés.",
    ifEnabled: "Les rendez-vous compatibles sont confirmés sans intervention manuelle.",
    moneyImpact: "Peut augmenter votre taux d'acceptation de 20 à 35 %.",
    aiVisibilityImpact: "high",
    alexScript: "L'acceptation automatique vous fait gagner du temps et améliore votre taux de prise.",
  },
  "automation.auto_accept_bookings": {
    id: "automation.auto_accept_bookings",
    label: "Acceptation auto des rendez-vous",
    what: "Confirme sans intervention les rendez-vous compatibles avec votre calendrier.",
    why: "Réduit votre temps de réponse à zéro pour les créneaux disponibles.",
    moneyImpact: "Booste votre taux d'acceptation de 20 à 35 %.",
    aiVisibilityImpact: "high",
    alexScript: "L'auto-acceptation peut multiplier vos confirmations sans effort.",
  },
  "automation.sms_followup": {
    id: "automation.sms_followup",
    label: "Relance SMS automatique",
    what: "Envoi automatique d'un SMS de rappel 24 h avant chaque rendez-vous.",
    why: "Réduit les no-shows de 30 à 50 %.",
    moneyImpact: "Chaque no-show évité représente un contrat potentiel récupéré.",
    aiVisibilityImpact: "medium",
    alexScript: "La relance SMS coupe les no-shows de moitié en moyenne.",
  },
  "automation.review_request": {
    id: "automation.review_request",
    label: "Demande d'avis automatique",
    what: "Envoi automatique d'une demande d'avis Google + UNPRO après chaque projet terminé.",
    why: "Vos avis pèsent directement sur votre AIPP et votre visibilité IA.",
    moneyImpact: "+1 avis 5★/mois peut faire monter votre AIPP de 2 à 4 points.",
    aiVisibilityImpact: "high",
    alexScript: "Les avis sont le carburant de votre visibilité IA. Automatiser, c'est l'effet boule de neige.",
  },
  "automation.no_show_protection": {
    id: "automation.no_show_protection",
    label: "Protection no-show",
    what: "UNPRO remplace automatiquement un client qui annule à la dernière minute.",
    why: "Sécurise votre revenu et protège votre cadence.",
    moneyImpact: "Récupère jusqu'à 80 % des plages annulées.",
    aiVisibilityImpact: "medium",
    alexScript: "La protection no-show garantit que vos plages ne sont jamais perdues.",
  },
  "automation.quote_auto_send": {
    id: "automation.quote_auto_send",
    label: "Envoi auto des soumissions",
    what: "Envoie automatiquement votre soumission après chaque visite, dans les 4 heures.",
    why: "La rapidité d'envoi multiplie les chances de signature.",
    moneyImpact: "Une soumission envoyée dans l'heure double presque le taux de fermeture.",
    aiVisibilityImpact: "low",
    alexScript: "Envoyer la soumission rapidement double presque vos chances de signer.",
  },
  "automation.smart_pricing": {
    id: "automation.smart_pricing",
    label: "Tarification dynamique",
    what: "UNPRO ajuste votre prix recommandé selon la demande, la saison et la zone.",
    why: "Maximise votre marge en haute demande, reste compétitif en basse saison.",
    moneyImpact: "Peut augmenter votre marge moyenne de 8 à 15 %.",
    aiVisibilityImpact: "low",
    alexScript: "La tarification dynamique optimise vos marges sans effort.",
  },
};

export function getRegistryEntry(id: string): SmartContextEntry | null {
  return SMART_CONTEXT_REGISTRY[id] ?? null;
}

/**
 * Pain data config for each role.
 */
import { type PainOption } from "@/hooks/useAdaptiveSession";

export const HOMEOWNER_PAINS: PainOption[] = [
  {
    id: "too-cold", label: "Trop froid chez moi", icon: "thermometer",
    heroTitle: "Fini le froid. On règle ça maintenant.",
    heroSub: "Diagnostic instantané + professionnel recommandé en 30 secondes.",
    ctaLabel: "Trouver une solution chauffage",
    ctaHref: "/alex",
    benefits: ["Diagnostic thermique IA", "Estimation de coût instantanée", "Rendez-vous garanti sous 48h"],
  },
  {
    id: "humidity", label: "Humidité / moisissure", icon: "droplets",
    heroTitle: "L'humidité ne disparaît pas seule.",
    heroSub: "Identifiez la cause et agissez avant que ça empire.",
    ctaLabel: "Diagnostiquer l'humidité",
    ctaHref: "/alex",
    benefits: ["Détection de la source", "Évaluation des risques santé", "Pro spécialisé recommandé"],
  },
  {
    id: "too-expensive", label: "Trop cher à chauffer", icon: "dollar",
    heroTitle: "Réduisez vos factures. Pas votre confort.",
    heroSub: "Analyse énergétique + subventions disponibles en un clic.",
    ctaLabel: "Voir mes économies potentielles",
    ctaHref: "/alex",
    benefits: ["Calcul d'économies IA", "Subventions auto-détectées", "ROI visible avant engagement"],
  },
  {
    id: "moving", label: "Je déménage bientôt", icon: "clock",
    heroTitle: "Déménagement? Tout organiser en 1 endroit.",
    heroSub: "Inspections, réparations, transferts — Alex coordonne tout.",
    ctaLabel: "Planifier mon déménagement",
    ctaHref: "/alex",
    benefits: ["Checklist personnalisée", "Pros disponibles à votre date", "Coordination automatique"],
  },
  {
    id: "dont-know", label: "Je ne sais pas quoi faire", icon: "help",
    heroTitle: "Pas sûr? C'est exactement pour ça qu'on existe.",
    heroSub: "Décrivez votre situation. Alex identifie le besoin.",
    ctaLabel: "Parler à Alex",
    ctaHref: "/alex",
    benefits: ["Aucune connaissance requise", "Diagnostic conversationnel", "Recommandation en 30 secondes"],
  },
  {
    id: "urgent-repair", label: "Réparation urgente", icon: "zap",
    heroTitle: "Urgence? On intervient maintenant.",
    heroSub: "Pro disponible dans l'heure. Garanti.",
    ctaLabel: "Déclencher une urgence",
    ctaHref: "/alex",
    benefits: ["Réponse en moins de 15 min", "Pro vérifié et disponible", "Suivi en temps réel"],
  },
];

export const CONTRACTOR_PAINS: PainOption[] = [
  {
    id: "google-ads", label: "Je paie trop en pub", icon: "dollar",
    heroTitle: "Arrêtez de payer par clic. Recevez des rendez-vous.",
    heroSub: "UNPRO vous envoie des clients qualifiés. Pas des leads froids.",
    ctaLabel: "Activer mes rendez-vous",
    ctaHref: "/entrepreneur/plan",
    benefits: ["Zéro coût par clic", "Rendez-vous confirmés uniquement", "ROI mesurable immédiatement"],
  },
  {
    id: "no-clients", label: "Pas assez de clients", icon: "trending",
    heroTitle: "Votre agenda devrait être plein. On s'en occupe.",
    heroSub: "Matching IA + rendez-vous garantis dans votre zone.",
    ctaLabel: "Remplir mon agenda",
    ctaHref: "/entrepreneur/plan",
    benefits: ["Clients dans votre zone", "Matching par spécialité", "Volume prévisible"],
  },
  {
    id: "bad-leads", label: "Leads de mauvaise qualité", icon: "search",
    heroTitle: "Fini les leads poubelle. Uniquement des vrais projets.",
    heroSub: "Chaque demande est qualifiée par IA avant de vous être envoyée.",
    ctaLabel: "Voir la qualité UNPRO",
    ctaHref: "/entrepreneur/plan",
    benefits: ["Pré-qualification IA", "Projet vérifié avant envoi", "Taux de fermeture 3x supérieur"],
  },
  {
    id: "visibility", label: "Personne me trouve en ligne", icon: "megaphone",
    heroTitle: "Soyez trouvé par les IA. Pas juste par Google.",
    heroSub: "Score AIPP + présence optimisée sur toutes les plateformes.",
    ctaLabel: "Scanner ma visibilité",
    ctaHref: "/entrepreneur",
    benefits: ["Score AIPP gratuit", "Visibilité IA optimisée", "Profil vérifié premium"],
  },
  {
    id: "reputation", label: "Pas assez d'avis", icon: "star",
    heroTitle: "Les avis construisent la confiance. On vous aide.",
    heroSub: "Système automatisé de collecte d'avis vérifiés.",
    ctaLabel: "Booster mes avis",
    ctaHref: "/entrepreneur/plan",
    benefits: ["Collecte automatique", "Avis vérifiés", "Badge de confiance UNPRO"],
  },
  {
    id: "competition", label: "Trop de compétition", icon: "users",
    heroTitle: "La compétition s'arrête quand vous êtes le recommandé.",
    heroSub: "UNPRO ne compare pas. UNPRO recommande. Vous.",
    ctaLabel: "Devenir le recommandé",
    ctaHref: "/entrepreneur/plan",
    benefits: ["Pas de comparaison de prix", "Recommandation directe", "Exclusivité par zone"],
  },
];

export const CONDO_PAINS: PainOption[] = [
  {
    id: "preventive", label: "Entretien préventif", icon: "wrench",
    heroTitle: "L'entretien préventif coûte 10x moins que l'urgence.",
    heroSub: "Plan de maintenance intelligent pour votre copropriété.",
    ctaLabel: "Voir mon plan préventif",
    ctaHref: "/condo",
    benefits: ["Calendrier automatisé", "Pros assignés par spécialité", "Historique complet"],
  },
  {
    id: "common-areas", label: "Problème aires communes", icon: "building",
    heroTitle: "Problème dans les aires communes? On intervient.",
    heroSub: "Diagnostic + pro disponible rapidement.",
    ctaLabel: "Signaler un problème",
    ctaHref: "/condo",
    benefits: ["Signalement en 1 clic", "Pro spécialisé copropriété", "Suivi pour le syndicat"],
  },
  {
    id: "loi16", label: "Loi 16 / Conformité", icon: "file",
    heroTitle: "Loi 16 : soyez conforme sans stress.",
    heroSub: "Carnet d'entretien + fonds de prévoyance + attestation.",
    ctaLabel: "Vérifier ma conformité",
    ctaHref: "/condo/loi-16",
    benefits: ["Analyse de conformité IA", "Documents générés automatiquement", "Pro certifié Loi 16"],
  },
  {
    id: "infiltration", label: "Infiltration / urgence", icon: "shield",
    heroTitle: "Infiltration détectée? Chaque heure compte.",
    heroSub: "Intervention d'urgence coordonnée par Alex.",
    ctaLabel: "Déclencher une intervention",
    ctaHref: "/condo",
    benefits: ["Réponse en moins de 30 min", "Coordination multi-corps de métier", "Rapport pour assurance"],
  },
  {
    id: "condo-dont-know", label: "Je ne sais pas par où commencer", icon: "help",
    heroTitle: "Gérer une copropriété, c'est complexe. On simplifie.",
    heroSub: "Alex analyse votre situation et propose un plan d'action.",
    ctaLabel: "Parler à Alex",
    ctaHref: "/alex",
    benefits: ["Diagnostic gratuit", "Plan d'action personnalisé", "Accompagnement continu"],
  },
];

export const PROFESSIONAL_PAINS: PainOption[] = [
  {
    id: "referrals", label: "Pas assez de références", icon: "users",
    heroTitle: "Recevez des références qualifiées. Automatiquement.",
    heroSub: "Réseau UNPRO + matching IA = croissance sans effort.",
    ctaLabel: "Rejoindre le réseau",
    ctaHref: "/entrepreneur/join",
    benefits: ["Références automatiques", "Réseau vérifié", "Commission transparente"],
  },
  {
    id: "time", label: "Pas le temps de prospecter", icon: "clock",
    heroTitle: "Votre temps vaut plus que la prospection.",
    heroSub: "UNPRO prospecte pour vous. Vous, vous travaillez.",
    ctaLabel: "Déléguer ma prospection",
    ctaHref: "/entrepreneur/plan",
    benefits: ["Zéro heure de prospection", "Rendez-vous dans votre agenda", "Focus sur votre métier"],
  },
  {
    id: "pricing", label: "Clients qui négocient trop", icon: "dollar",
    heroTitle: "Vos prix sont justes. On les défend.",
    heroSub: "UNPRO éduque le client avant qu'il vous contacte.",
    ctaLabel: "Protéger mes marges",
    ctaHref: "/entrepreneur/plan",
    benefits: ["Clients pré-éduqués", "Estimation IA partagée", "Moins de négociation"],
  },
  {
    id: "pro-dont-know", label: "Je veux explorer les options", icon: "help",
    heroTitle: "Découvrez comment UNPRO travaille pour vous.",
    heroSub: "Analyse gratuite de votre potentiel de croissance.",
    ctaLabel: "Analyser mon potentiel",
    ctaHref: "/entrepreneur",
    benefits: ["Score AIPP gratuit", "Analyse de marché", "Plan de croissance IA"],
  },
];

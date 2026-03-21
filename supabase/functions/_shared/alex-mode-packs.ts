/**
 * Alex Mode-Specific Reply Packs
 *
 * Each mode defines tone, pacing, vocabulary, and pre-written
 * spoken phrases optimized for real-time TTS delivery.
 *
 * Rules enforced by design:
 *  - Max 1 question per turn
 *  - Short spoken sentences (≤15 words target)
 *  - No generic AI phrasing
 *  - Quebec-compatible, premium, human
 */

import { pick } from "./alex-quebec-phrases.ts";

// ─── Mode Metadata ───

export interface AlexModeConfig {
  key: string;
  tone: string;
  directness: "soft" | "moderate" | "direct" | "very_direct";
  warmth: "warm" | "very_warm" | "neutral" | "professional";
  /** Target words per sentence */
  pacingTarget: number;
  preferredVocabulary: readonly string[];
  phrasesToAvoid: readonly string[];
  replies: readonly string[];
  questions: readonly string[];
}

// ─── 1. Homeowner Guidance ───

export const HOMEOWNER_GUIDANCE: AlexModeConfig = {
  key: "homeowner_guidance",
  tone: "Rassurante, accessible, proactive",
  directness: "moderate",
  warmth: "very_warm",
  pacingTarget: 10,
  preferredVocabulary: [
    "maison", "chez vous", "ton projet", "vérifier", "regarder",
    "photo", "score", "rendez-vous", "budget", "priorité",
  ],
  phrasesToAvoid: [
    "diagnostiquer", "procéder à l'évaluation", "nous recommandons",
    "il serait judicieux", "selon nos analyses", "n'hésitez pas",
  ],
  replies: [
    "C'est courant, on voit ça souvent.",
    "Tu fais bien de t'en occuper.",
    "C'est réparable, inquiète-toi pas.",
    "Le mieux c'est de commencer par une photo.",
    "Je peux te montrer ton score.",
    "On va faire simple.",
    "C'est pas urgent, mais c'est bon de vérifier.",
    "Je te suggère de regarder ça en premier.",
    "On peut avancer tout de suite.",
    "Je vais te trouver quelqu'un de fiable.",
    "C'est noté, on regarde ça.",
    "Ça se règle bien.",
    "Y'a des options pour chaque budget.",
    "Pas besoin de tout faire d'un coup.",
    "On va y aller étape par étape.",
    "Je connais bien ce type de problème.",
    "On peut regarder ensemble.",
    "C'est un bon réflexe.",
    "Tu vas voir, c'est plus simple que ça en a l'air.",
    "Je suis là pour ça.",
  ],
  questions: [
    "Tu veux que je regarde ça?",
    "C'est quoi qui t'inquiète le plus?",
    "Tu as une photo à m'envoyer?",
    "C'est récent ou ça fait un bout?",
    "Tu veux qu'on prépare le rendez-vous?",
    "C'est ta maison ou un condo?",
    "Tu as un budget en tête?",
    "Tu préfères cette semaine ou la semaine prochaine?",
    "C'est à l'intérieur ou à l'extérieur?",
    "Tu veux voir ton score maison?",
  ],
};

// ─── 2. Contractor Growth ───

export const CONTRACTOR_GROWTH: AlexModeConfig = {
  key: "contractor_growth",
  tone: "Directe, motivante, stratégique",
  directness: "direct",
  warmth: "professional",
  pacingTarget: 11,
  preferredVocabulary: [
    "rendez-vous", "exclusif", "profil", "visibilité", "forfait",
    "croissance", "zone", "vérifié", "positionnement", "Élite",
  ],
  phrasesToAvoid: [
    "lead", "leads", "prospect", "client potentiel", "pipeline",
    "ROI", "KPI", "conversion funnel", "selon nos données",
  ],
  replies: [
    "Ton profil peut ressortir plus.",
    "Les entrepreneurs vérifiés sortent en premier.",
    "Chaque rendez-vous est exclusif pour toi.",
    "On t'envoie juste des projets dans ta zone.",
    "Tes rendez-vous sont garantis.",
    "C'est un bon move de te positionner maintenant.",
    "Le plan Élite donne plus de visibilité.",
    "On peut améliorer ton positionnement.",
    "Tu vas recevoir des projets qualifiés.",
    "Ton profil est déjà bien, on peut faire mieux.",
    "La vérification augmente la confiance.",
    "Les propriétaires préfèrent les profils vérifiés.",
    "Tu peux monter de plan quand tu veux.",
    "On va t'aider à remplir ton calendrier.",
    "C'est fait pour les entrepreneurs sérieux.",
    "Tu mérites des meilleurs projets.",
    "Le retour se voit vite avec le bon forfait.",
    "On peut comparer les options ensemble.",
    "Ton secteur est en demande.",
    "C'est le bon moment pour investir dans ta visibilité.",
  ],
  questions: [
    "Tu veux voir tes options de forfait?",
    "C'est quoi ta zone principale?",
    "Tu veux plus de rendez-vous cette saison?",
    "Ton profil est à jour?",
    "Tu veux qu'on compare les plans?",
    "Tu travailles dans combien de villes?",
    "Tu es déjà vérifié?",
    "C'est quoi ton objectif de croissance?",
    "Tu veux voir ce que le plan Élite inclut?",
    "Tu préfères résidentiel ou commercial?",
  ],
};

// ─── 3. Condo Mode ───

export const CONDO_MODE: AlexModeConfig = {
  key: "condo_mode",
  tone: "Compétente, structurée, rassurante",
  directness: "moderate",
  warmth: "warm",
  pacingTarget: 12,
  preferredVocabulary: [
    "syndicat", "copropriété", "assemblée", "quorum", "fonds de prévoyance",
    "Loi 16", "résolution", "administrateur", "unité", "charges communes",
  ],
  phrasesToAvoid: [
    "HOA", "strata", "management company", "condo fees",
    "board of directors", "selon la jurisprudence",
  ],
  replies: [
    "Je connais bien la réalité des copropriétés.",
    "C'est une décision d'assemblée.",
    "Le fonds de prévoyance doit couvrir ça.",
    "L'étude du fonds va te donner les chiffres.",
    "Pour ça, il faut le quorum.",
    "On peut préparer la résolution.",
    "La Loi 16 exige ça maintenant.",
    "C'est normal, beaucoup de syndicats passent par là.",
    "On peut planifier ça correctement.",
    "Les charges communes peuvent être ajustées.",
    "Tu as le droit de demander les documents.",
    "L'assemblée peut voter ça.",
    "Le carnet d'entretien est obligatoire.",
    "C'est un gros chantier, mais c'est faisable.",
    "Je peux t'aider à prioriser.",
    "Les travaux majeurs demandent une planification.",
    "Le syndicat doit aviser tous les copropriétaires.",
    "C'est dans les règles du jeu.",
    "On va regarder les obligations ensemble.",
    "Tu gères bien, c'est pas évident.",
  ],
  questions: [
    "Tu gères un syndicat?",
    "C'est quoi le dossier principal en ce moment?",
    "L'assemblée est prévue pour quand?",
    "Tu as besoin d'un estimé pour les travaux?",
    "C'est combien d'unités?",
    "Le fonds de prévoyance est à jour?",
    "Tu veux qu'on regarde les obligations?",
    "C'est un entretien courant ou des travaux majeurs?",
    "Tu as le carnet d'entretien?",
    "Le quorum est atteint habituellement?",
  ],
};

// ─── 4. Urgency Mode ───

export const URGENCY_MODE: AlexModeConfig = {
  key: "urgency_mode",
  tone: "Calme, rapide, rassurante",
  directness: "very_direct",
  warmth: "warm",
  pacingTarget: 8,
  preferredVocabulary: [
    "maintenant", "tout de suite", "vite", "urgent", "sécurité",
    "dégât", "fuite", "danger", "fermer", "appeler",
  ],
  phrasesToAvoid: [
    "en temps opportun", "dès que possible", "quand ça vous convient",
    "nous allons planifier", "à votre convenance",
  ],
  replies: [
    "OK, on s'en occupe maintenant.",
    "C'est urgent, je comprends.",
    "On va aller vite.",
    "Prends une respiration, on va régler ça.",
    "C'est stressant, mais on a des options.",
    "On va trouver quelqu'un rapidement.",
    "Je lance la recherche.",
    "Coupe l'eau en attendant si tu peux.",
    "La sécurité d'abord.",
    "On va prioriser ça.",
    "Je cherche quelqu'un disponible maintenant.",
    "C'est le genre de chose qui se règle vite.",
    "Touche à rien, on envoie quelqu'un.",
    "Je suis là, on va avancer.",
    "C'est normal d'être stressé, on gère.",
    "On va régler ça aujourd'hui.",
    "Tu as bien fait d'appeler maintenant.",
    "C'est la bonne décision.",
    "On priorise ta situation.",
    "Quelqu'un va te contacter sous peu.",
  ],
  questions: [
    "Dis-moi exactement ce qui se passe.",
    "C'est quand que c'est arrivé?",
    "Y'a un danger immédiat?",
    "Tu peux m'envoyer une photo?",
    "L'eau est coupée?",
    "Tu es sur place?",
    "Tu veux que je trouve quelqu'un maintenant?",
    "C'est accessible ou bloqué?",
    "Y'a des dégâts visibles?",
    "Tu veux qu'on réserve en urgence?",
  ],
};

// ─── 5. Trust & Verify Mode ───

export const TRUST_VERIFY_MODE: AlexModeConfig = {
  key: "trust_verify_mode",
  tone: "Transparente, factuelle, rassurante",
  directness: "moderate",
  warmth: "professional",
  pacingTarget: 11,
  preferredVocabulary: [
    "vérifié", "licence", "RBQ", "assurance", "références",
    "confiance", "score", "historique", "certifié", "fiable",
  ],
  phrasesToAvoid: [
    "nous garantissons", "certification premium", "exclusivité totale",
    "partenaire de confiance vérifié et approuvé", "selon nos standards",
  ],
  replies: [
    "On vérifie la licence RBQ directement.",
    "L'assurance est vérifiée aussi.",
    "Son profil est complet et à jour.",
    "Les avis sont authentiques.",
    "La vérification prend quelques jours.",
    "C'est un entrepreneur vérifié.",
    "Son score de confiance est bon.",
    "On regarde les références aussi.",
    "Tu peux voir son historique complet.",
    "La licence est valide et active.",
    "Aucune plainte au dossier.",
    "Son assurance couvre ce type de travaux.",
    "On fait les vérifications pour toi.",
    "C'est transparent, tu vois tout.",
    "Le dossier est propre.",
    "On vérifie ça automatiquement.",
    "Tu peux avoir confiance.",
    "C'est un profil solide.",
    "Les vérifications sont à jour.",
    "On surveille les dossiers en continu.",
  ],
  questions: [
    "Tu veux voir les détails de vérification?",
    "C'est quel entrepreneur qui t'intéresse?",
    "Tu veux vérifier la licence?",
    "Tu as vu son score de confiance?",
    "Tu veux comparer avec d'autres profils?",
    "C'est pour quel type de travaux?",
    "Tu veux voir les avis?",
    "Tu préfères quelqu'un de ta région?",
    "Tu veux que je vérifie ses assurances?",
    "Tu veux voir son historique?",
  ],
};

// ─── 6. Booking Mode ───

export const BOOKING_MODE: AlexModeConfig = {
  key: "booking_mode",
  tone: "Efficace, chaleureuse, action-focused",
  directness: "direct",
  warmth: "warm",
  pacingTarget: 9,
  preferredVocabulary: [
    "rendez-vous", "disponible", "confirmer", "réserver", "date",
    "heure", "semaine", "demain", "créneaux", "prêt",
  ],
  phrasesToAvoid: [
    "planifier une consultation", "organiser une rencontre",
    "à votre plus proche convenance", "slot", "appointment",
  ],
  replies: [
    "On peut réserver maintenant.",
    "Y'a des créneaux cette semaine.",
    "C'est confirmé.",
    "Ton rendez-vous est prêt.",
    "Je t'envoie la confirmation.",
    "C'est noté dans ton dossier.",
    "L'entrepreneur va te contacter.",
    "Tu vas recevoir un rappel.",
    "C'est exclusif pour toi.",
    "On bloque le créneau.",
    "Demain matin ça marche.",
    "C'est gratuit, sans engagement.",
    "Tu peux annuler si besoin.",
    "On te rappelle la veille.",
    "C'est réservé.",
    "L'entrepreneur est confirmé.",
    "Tout est en ordre.",
    "Tu vas avoir des nouvelles rapidement.",
    "C'est fait.",
    "On s'occupe du reste.",
  ],
  questions: [
    "Tu préfères le matin ou l'après-midi?",
    "Cette semaine ou la semaine prochaine?",
    "C'est pour quelle adresse?",
    "Tu veux confirmer ce rendez-vous?",
    "Demain ça te convient?",
    "Tu as une préférence de jour?",
    "Tu veux qu'on réserve tout de suite?",
    "C'est pour toi ou quelqu'un d'autre?",
    "Tu veux voir les disponibilités?",
    "On confirme?",
  ],
};

// ─── Registry ───

export const ALEX_MODE_PACKS: Record<string, AlexModeConfig> = {
  homeowner_guidance: HOMEOWNER_GUIDANCE,
  contractor_growth: CONTRACTOR_GROWTH,
  condo_mode: CONDO_MODE,
  urgency_mode: URGENCY_MODE,
  trust_verify_mode: TRUST_VERIFY_MODE,
  booking_mode: BOOKING_MODE,
};

/**
 * Get a contextual reply for the given mode.
 * Returns a short spoken sentence ready for TTS.
 */
export function getModeScopedReply(mode: string): string {
  const pack = ALEX_MODE_PACKS[mode];
  if (!pack) return "Je suis là.";
  return pick(pack.replies);
}

/**
 * Get a contextual question for the given mode.
 * Returns a single short question ready for TTS.
 */
export function getModeScopedQuestion(mode: string): string {
  const pack = ALEX_MODE_PACKS[mode];
  if (!pack) return "Comment je peux t'aider?";
  return pick(pack.questions);
}

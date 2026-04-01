/**
 * Alex Context Prompt Engine
 * Resolves the best contextual prompt based on intent, image context, role, and locale.
 * Uses local library first, with Supabase fallback for custom prompts.
 */

export interface AlexContextPrompt {
  id: string;
  intentKey: string;
  contextKey: string;
  roomType?: string;
  issueType?: string;
  roleType: string;
  locale: string;
  greetingText: string;
  primaryQuestion: string;
  quickReplies: string[];
  nextFlow?: string;
  priority: number;
}

export interface DetectedContext {
  room?: string;
  style?: string;
  issue?: string;
  objects?: string[];
  confidence: number;
  suggestedIntent?: string;
}

export type TriggerType = "pill" | "photo" | "camera" | "resume" | "cold";

// ═══════════════════════════════════════════
// BUILT-IN PROMPT LIBRARY
// ═══════════════════════════════════════════

const PROMPT_LIBRARY: AlexContextPrompt[] = [
  // ── DESIGN: Kitchen ──
  {
    id: "design-kitchen-old",
    intentKey: "design",
    contextKey: "old_kitchen",
    roomType: "cuisine",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Bonjour. Je vois une cuisine qui pourrait être modernisée.",
    primaryQuestion: "C'est pour mettre à jour les couleurs ou refaire la cuisine au complet ?",
    quickReplies: ["Couleurs seulement", "Relooker sans tout changer", "Refaire au complet", "Voir des idées"],
    nextFlow: "design",
    priority: 90,
  },
  {
    id: "design-kitchen-counter",
    intentKey: "design",
    contextKey: "kitchen_counter",
    roomType: "cuisine",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Je vois une cuisine plus ancienne.",
    primaryQuestion: "Vous voulez surtout moderniser le look ou revoir aussi les comptoirs et armoires ?",
    quickReplies: ["Juste le look", "Armoires et comptoirs", "Refaire au complet", "Je veux voir avant/après"],
    nextFlow: "design",
    priority: 85,
  },
  {
    id: "design-kitchen-stone",
    intentKey: "design",
    contextKey: "kitchen_stone",
    roomType: "cuisine",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Je peux vous proposer quelques pistes de design.",
    primaryQuestion: "Vous aimez un style plus chaleureux comme le granit, ou quelque chose de plus épuré ?",
    quickReplies: ["J'aime le granit", "Plus épuré", "Je ne sais pas encore", "Montre-moi des options"],
    nextFlow: "design",
    priority: 80,
  },
  // ── DESIGN: Bathroom ──
  {
    id: "design-bathroom",
    intentKey: "design",
    contextKey: "bathroom",
    roomType: "salle_de_bain",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Je vois une salle de bain qui pourrait être rafraîchie.",
    primaryQuestion: "Vous voulez un relooking rapide ou une rénovation complète ?",
    quickReplies: ["Relooking rapide", "Rénovation complète", "Voir des inspirations", "Estimer le budget"],
    nextFlow: "design",
    priority: 85,
  },
  // ── DESIGN: Facade ──
  {
    id: "design-facade",
    intentKey: "design",
    contextKey: "facade",
    roomType: "facade",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Je vois une façade avec potentiel.",
    primaryQuestion: "Vous voulez surtout améliorer le style, la valeur perçue ou corriger quelque chose ?",
    quickReplies: ["Le style", "La valeur", "Corriger un problème", "Voir des idées"],
    nextFlow: "design",
    priority: 80,
  },
  // ── PROBLEM: Plumbing ──
  {
    id: "problem-plumbing",
    intentKey: "detect_problem",
    contextKey: "plumbing",
    issueType: "plomberie",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Bonjour. Je peux vérifier ça avec vous.",
    primaryQuestion: "C'est une fuite visible, un drain lent ou un problème qui revient souvent ?",
    quickReplies: ["Fuite visible", "Drain lent", "Revient souvent", "Je ne suis pas certain"],
    nextFlow: "diagnostic",
    priority: 90,
  },
  // ── PROBLEM: Humidity ──
  {
    id: "problem-humidity",
    intentKey: "detect_problem",
    contextKey: "humidity",
    issueType: "humidite",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Je vois possiblement un enjeu d'humidité.",
    primaryQuestion: "Vous voyez surtout des taches, une odeur ou de l'eau qui entre ?",
    quickReplies: ["Taches", "Odeur", "Eau qui entre", "Moisissure possible"],
    nextFlow: "diagnostic",
    priority: 90,
  },
  // ── PROBLEM: Crack ──
  {
    id: "problem-crack",
    intentKey: "detect_problem",
    contextKey: "crack",
    issueType: "fissure",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Je peux regarder ça avec vous.",
    primaryQuestion: "La fissure vous semble surtout esthétique ou elle s'agrandit ?",
    quickReplies: ["Plutôt esthétique", "Elle s'agrandit", "Je veux vérifier vite", "Montrer à un pro"],
    nextFlow: "diagnostic",
    priority: 85,
  },
  // ── PROBLEM: Roof ──
  {
    id: "problem-roof",
    intentKey: "detect_problem",
    contextKey: "roof",
    issueType: "toiture",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Je vois un indice possible lié à la toiture ou à la ventilation.",
    primaryQuestion: "C'est surtout pour vérifier une infiltration, des glaçons ou une perte de chaleur ?",
    quickReplies: ["Infiltration", "Glaçons", "Perte de chaleur", "Je ne sais pas"],
    nextFlow: "diagnostic",
    priority: 85,
  },
  // ── PROBLEM: Gutter ──
  {
    id: "problem-gutter",
    intentKey: "detect_problem",
    contextKey: "gutter",
    issueType: "gouttiere",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Je peux vous aider à valider ça.",
    primaryQuestion: "Vous voulez vérifier un blocage, un débordement ou un problème de ventilation ?",
    quickReplies: ["Blocage", "Débordement", "Ventilation", "Besoin d'un avis"],
    nextFlow: "diagnostic",
    priority: 80,
  },
  // ── FIND CONTRACTOR ──
  {
    id: "find-contractor-general",
    intentKey: "find_contractor",
    contextKey: "general",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Bonjour. Je peux vous aider à trouver le bon entrepreneur.",
    primaryQuestion: "Vous cherchez surtout quelqu'un de disponible rapidement, de très bien noté, ou spécialisé ?",
    quickReplies: ["Disponible rapidement", "Très bien noté", "Spécialisé", "Comparer mes options"],
    nextFlow: "matching",
    priority: 80,
  },
  {
    id: "find-contractor-after-photo",
    intentKey: "find_contractor",
    contextKey: "after_photo",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Je vois mieux le type de besoin.",
    primaryQuestion: "Vous voulez que je trouve un entrepreneur compatible pour ce type de travaux ?",
    quickReplies: ["Oui, trouvez-moi quelqu'un", "Voir 3 options", "D'abord estimer", "Vérifier mes soumissions"],
    nextFlow: "matching",
    priority: 85,
  },
  // ── VERIFY QUOTES ──
  {
    id: "verify-quotes-no-doc",
    intentKey: "verify_quotes",
    contextKey: "no_document",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Je peux vous aider à démêler tout ça.",
    primaryQuestion: "Vous voulez comparer des prix, repérer les oublis ou vérifier les différences entre les soumissions ?",
    quickReplies: ["Comparer les prix", "Repérer les oublis", "Comprendre les différences", "Téléverser mes soumissions"],
    nextFlow: "quote_analysis",
    priority: 80,
  },
  {
    id: "verify-quotes-doc",
    intentKey: "verify_quotes",
    contextKey: "document_uploaded",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Parfait. Je peux regarder vos soumissions avec vous.",
    primaryQuestion: "Vous voulez surtout voir ce qui manque, ce qui est flou, ou laquelle semble la plus solide ?",
    quickReplies: ["Ce qui manque", "Ce qui est flou", "La plus solide", "Tout comparer"],
    nextFlow: "quote_analysis",
    priority: 85,
  },
  // ── PASSPORT MAISON ──
  {
    id: "passport-discover",
    intentKey: "passport",
    contextKey: "discover",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Le Passeport Maison centralise les informations importantes de votre propriété.",
    primaryQuestion: "Vous voulez voir à quoi ça sert, ce qu'il contient ou comment commencer le vôtre ?",
    quickReplies: ["À quoi ça sert", "Ce qu'il contient", "Commencer le mien", "Voir un exemple"],
    nextFlow: "passport",
    priority: 75,
  },
  {
    id: "passport-after-photo",
    intentKey: "passport",
    contextKey: "after_photo",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Cette photo peut déjà servir à enrichir votre Passeport Maison.",
    primaryQuestion: "Vous voulez l'ajouter à votre dossier ou l'utiliser d'abord pour une analyse ?",
    quickReplies: ["Ajouter au Passeport", "Analyser d'abord", "Les deux", "En savoir plus"],
    nextFlow: "passport",
    priority: 80,
  },
  // ── ENTREPRENEUR ──
  {
    id: "entrepreneur-cold",
    intentKey: "entrepreneur",
    contextKey: "cold",
    roleType: "contractor",
    locale: "fr",
    greetingText: "Bonjour. Vous êtes ici pour votre entreprise ?",
    primaryQuestion: "Vous voulez voir votre score IA, améliorer votre profil ou obtenir plus de rendez-vous ?",
    quickReplies: ["Voir mon score IA", "Améliorer mon profil", "Plus de rendez-vous", "Comprendre UNPRO"],
    nextFlow: "contractor_onboarding",
    priority: 70,
  },
  // ── CONDO ──
  {
    id: "condo-general",
    intentKey: "condo",
    contextKey: "general",
    roleType: "condo_manager",
    locale: "fr",
    greetingText: "Je peux vous aider pour un enjeu de copropriété.",
    primaryQuestion: "C'est pour un problème urgent, des travaux à planifier ou une question liée au syndicat ?",
    quickReplies: ["Problème urgent", "Travaux à planifier", "Question syndicat", "Passeport Condo"],
    nextFlow: "condo",
    priority: 75,
  },
  // ── FALLBACKS ──
  {
    id: "fallback-1",
    intentKey: "general",
    contextKey: "fallback",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Bonjour. Vous voulez que je vérifie pour vous ?",
    primaryQuestion: "Vous n'avez qu'à téléverser une photo.",
    quickReplies: ["Téléverser une photo", "Décrire mon problème", "Trouver un pro", "Voir comment ça marche"],
    nextFlow: "general",
    priority: 10,
  },
  {
    id: "fallback-2",
    intentKey: "general",
    contextKey: "fallback_2",
    roleType: "homeowner",
    locale: "fr",
    greetingText: "Montrez-moi ce que vous voyez, et je vous guide.",
    primaryQuestion: "",
    quickReplies: ["Prendre une photo", "Détecter un problème", "Améliorer un design", "Vérifier mes soumissions"],
    nextFlow: "general",
    priority: 5,
  },
];

// ═══════════════════════════════════════════
// PILL → INTENT MAPPING
// ═══════════════════════════════════════════

const PILL_INTENT_MAP: Record<string, { intentKey: string; contextKey: string }> = {
  "toiture": { intentKey: "detect_problem", contextKey: "roof" },
  "cuisine": { intentKey: "design", contextKey: "old_kitchen" },
  "plomberie": { intentKey: "detect_problem", contextKey: "plumbing" },
  "electricite": { intentKey: "detect_problem", contextKey: "general" },
  "renovation": { intentKey: "design", contextKey: "old_kitchen" },
  "demenagement": { intentKey: "general", contextKey: "fallback" },
  "salle_de_bain": { intentKey: "design", contextKey: "bathroom" },
  "facade": { intentKey: "design", contextKey: "facade" },
  "fondation": { intentKey: "detect_problem", contextKey: "crack" },
  "isolation": { intentKey: "detect_problem", contextKey: "roof" },
  "fenetre": { intentKey: "design", contextKey: "facade" },
  "soumissions": { intentKey: "verify_quotes", contextKey: "no_document" },
  "passeport": { intentKey: "passport", contextKey: "discover" },
  "entrepreneur": { intentKey: "entrepreneur", contextKey: "cold" },
  "condo": { intentKey: "condo", contextKey: "general" },
  "find_contractor": { intentKey: "find_contractor", contextKey: "general" },
};

// ═══════════════════════════════════════════
// ROOM DETECTION (from image analysis tags)
// ═══════════════════════════════════════════

const ROOM_KEYWORDS: Record<string, string[]> = {
  cuisine: ["kitchen", "cuisine", "comptoir", "counter", "armoire", "cabinet", "stove", "sink", "évier"],
  salle_de_bain: ["bathroom", "salle de bain", "shower", "douche", "toilet", "toilette", "vanity", "bain"],
  toiture: ["roof", "toiture", "shingle", "bardeau", "gutter", "gouttière", "chimney", "cheminée"],
  sous_sol: ["basement", "sous-sol", "foundation", "fondation"],
  facade: ["facade", "siding", "revêtement", "brick", "brique", "entrance", "door"],
};

const ISSUE_KEYWORDS: Record<string, string[]> = {
  humidite: ["mold", "moisissure", "humidity", "humidité", "water", "eau", "stain", "tache", "damp"],
  fissure: ["crack", "fissure", "split", "broken"],
  plomberie: ["pipe", "tuyau", "leak", "fuite", "drain", "plumbing"],
  toiture: ["roof", "shingle", "ice", "glace", "glaçon", "infiltration"],
  gouttiere: ["gutter", "gouttière", "downspout", "descente"],
};

export function detectRoomFromTags(tags: string[]): string | undefined {
  const joined = tags.join(" ").toLowerCase();
  for (const [room, keywords] of Object.entries(ROOM_KEYWORDS)) {
    if (keywords.some((kw) => joined.includes(kw))) return room;
  }
  return undefined;
}

export function detectIssueFromTags(tags: string[]): string | undefined {
  const joined = tags.join(" ").toLowerCase();
  for (const [issue, keywords] of Object.entries(ISSUE_KEYWORDS)) {
    if (keywords.some((kw) => joined.includes(kw))) return issue;
  }
  return undefined;
}

// ═══════════════════════════════════════════
// RESOLVE BEST PROMPT
// ═══════════════════════════════════════════

interface ResolveParams {
  triggerType: TriggerType;
  pillKey?: string;
  imageContext?: DetectedContext;
  role?: string;
  locale?: string;
}

export function resolveContextPrompt(params: ResolveParams): AlexContextPrompt {
  const { triggerType, pillKey, imageContext, role = "homeowner", locale = "fr" } = params;

  let intentKey = "general";
  let contextKey = "fallback";

  // Step 1: Derive intent from pill
  if (triggerType === "pill" && pillKey && PILL_INTENT_MAP[pillKey]) {
    intentKey = PILL_INTENT_MAP[pillKey].intentKey;
    contextKey = PILL_INTENT_MAP[pillKey].contextKey;
  }

  // Step 2: Override with image context if available
  if (imageContext && imageContext.confidence > 0.4) {
    if (imageContext.suggestedIntent) intentKey = imageContext.suggestedIntent;
    if (imageContext.room) {
      // Map room to context key
      const roomContextMap: Record<string, string> = {
        cuisine: "old_kitchen",
        salle_de_bain: "bathroom",
        facade: "facade",
        toiture: "roof",
        sous_sol: "humidity",
      };
      contextKey = roomContextMap[imageContext.room] || contextKey;
    }
    if (imageContext.issue) {
      const issueContextMap: Record<string, string> = {
        humidite: "humidity",
        fissure: "crack",
        plomberie: "plumbing",
        toiture: "roof",
        gouttiere: "gutter",
      };
      contextKey = issueContextMap[imageContext.issue] || contextKey;
      intentKey = "detect_problem";
    }
  }

  // Step 3: Photo with no context → suggest after_photo variant
  if ((triggerType === "photo" || triggerType === "camera") && !imageContext) {
    contextKey = "after_photo";
  }

  // Step 4: Find best match from library
  const candidates = PROMPT_LIBRARY.filter((p) => {
    if (p.locale !== locale) return false;
    if (p.intentKey === intentKey && p.contextKey === contextKey) return true;
    if (p.intentKey === intentKey) return true;
    return false;
  }).sort((a, b) => {
    // Exact context match wins
    const aExact = a.contextKey === contextKey ? 100 : 0;
    const bExact = b.contextKey === contextKey ? 100 : 0;
    return (bExact + b.priority) - (aExact + a.priority);
  });

  // Step 5: Role-specific override
  if (role === "contractor") {
    const contractorPrompt = candidates.find((c) => c.roleType === "contractor");
    if (contractorPrompt) return contractorPrompt;
  }
  if (role === "condo_manager") {
    const condoPrompt = candidates.find((c) => c.roleType === "condo_manager");
    if (condoPrompt) return condoPrompt;
  }

  return candidates[0] || PROMPT_LIBRARY.find((p) => p.id === "fallback-1")!;
}

// ═══════════════════════════════════════════
// NEXT FLOW ROUTER
// ═══════════════════════════════════════════

export const FLOW_ROUTES: Record<string, string> = {
  design: "/describe-project",
  diagnostic: "/describe-project",
  matching: "/describe-project",
  quote_analysis: "/dashboard/quotes/upload",
  passport: "/dashboard/property",
  contractor_onboarding: "/pro",
  condo: "/dashboard/syndicate",
  general: "/describe-project",
};

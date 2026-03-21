/**
 * Alex Quebec Phrase Pack
 *
 * Natural, premium, Quebec-compatible French phrases for Alex voice.
 * NOT slang. NOT Parisian formal. Calm, credible, human.
 *
 * Usage: pick a random phrase from the relevant category to inject
 * natural variation into Alex's spoken responses.
 */

// ─── Helpers ───

/** Pick a random item from an array */
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick N unique items from an array */
export function pickN<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

// ─── Mode Detection ───

export type AlexMode = "homeowner" | "contractor" | "condo" | "urgency";

// ─── Acknowledgments ───
// Short bridge sentences after greeting or between turns.

export const ACK = {
  neutral: [
    "Je suis là.",
    "Je vous écoute.",
    "D'accord.",
    "Je vois.",
    "Compris.",
    "OK.",
  ],
  returning: [
    "On reprend.",
    "Je suis encore là.",
    "On continue.",
  ],
  afterPhoto: [
    "J'ai vu la photo.",
    "Bon, je regarde ça.",
    "OK, je vois ce que c'est.",
  ],
  afterQuestion: [
    "Bonne question.",
    "Je comprends.",
    "OK, on va voir ça.",
  ],
} as const;

// ─── Homeowner Mode ───

export const HOMEOWNER = {
  /** Offering to help */
  offers: [
    "Tu veux que je regarde ça?",
    "Je peux vérifier pour toi.",
    "On peut avancer tout de suite.",
    "Tu veux qu'on commence?",
    "Je peux te montrer ton score.",
  ],
  /** Guiding next steps */
  nextSteps: [
    "Le mieux, c'est de prendre une photo.",
    "On va faire simple.",
    "Je te suggère de commencer par ça.",
    "Montre-moi ce qui se passe.",
    "Envoie-moi une photo, je vais te dire.",
  ],
  /** Booking guidance */
  booking: [
    "Tu veux qu'on prépare le rendez-vous?",
    "Je peux te trouver quelqu'un de fiable.",
    "On peut réserver maintenant si tu veux.",
    "Tu préfères cette semaine ou la semaine prochaine?",
  ],
  /** Reassurance */
  reassure: [
    "C'est correct, c'est courant.",
    "On voit ça souvent.",
    "C'est pas urgent, mais c'est bon de vérifier.",
    "Tu fais bien de t'en occuper.",
    "C'est réparable.",
  ],
  /** Budget sensitivity */
  budget: [
    "On peut regarder ce qui rentre dans ton budget.",
    "Y'a des options pour tous les budgets.",
    "On va trouver quelque chose qui marche.",
    "Pas besoin de tout faire d'un coup.",
  ],
} as const;

// ─── Contractor Mode ───

export const CONTRACTOR = {
  /** Growth and plans */
  growth: [
    "Tu veux qu'on regarde tes options?",
    "Je peux te montrer ce que le plan Élite inclut.",
    "On peut comparer les forfaits ensemble.",
    "Tu veux voir comment augmenter tes rendez-vous?",
  ],
  /** Positioning */
  positioning: [
    "Ton profil peut ressortir plus.",
    "On peut améliorer ta visibilité.",
    "Les entrepreneurs vérifiés sortent en premier.",
    "Je peux te montrer ton positionnement actuel.",
  ],
  /** Rendez-vous (never say "lead") */
  appointments: [
    "Tu vas recevoir des rendez-vous exclusifs.",
    "Chaque rendez-vous est pour toi seul.",
    "On t'envoie juste des projets dans ta zone.",
    "Tes rendez-vous sont garantis.",
  ],
  /** Encouragement */
  encourage: [
    "T'es sur la bonne track.",
    "C'est un bon move.",
    "On va t'aider à grandir.",
    "Tu fais bien de te positionner maintenant.",
  ],
} as const;

// ─── Condo Mode ───

export const CONDO = {
  /** Syndicate / admin guidance */
  admin: [
    "Tu gères un syndicat?",
    "Je connais bien la réalité des copropriétés.",
    "On peut regarder ça ensemble.",
    "C'est quoi le dossier principal en ce moment?",
  ],
  /** Quorum and votes */
  quorum: [
    "Pour ça, il faut le quorum.",
    "C'est une décision d'assemblée.",
    "Tu as besoin de la majorité pour avancer.",
    "On peut préparer la résolution.",
  ],
  /** Loi 16 / fonds de prévoyance */
  legal: [
    "C'est lié à la Loi 16.",
    "Le fonds de prévoyance doit couvrir ça.",
    "L'étude du fonds va te donner les chiffres.",
    "Tu veux qu'on regarde les obligations?",
  ],
  /** Major works */
  works: [
    "C'est un gros chantier, mais c'est faisable.",
    "On peut planifier ça correctement.",
    "Tu veux un estimé pour le projet?",
    "Je peux t'aider à prioriser.",
  ],
} as const;

// ─── Urgency Mode ───

export const URGENCY = {
  /** Immediate response */
  immediate: [
    "OK, on s'en occupe maintenant.",
    "C'est urgent, je comprends.",
    "On va aller vite.",
    "Dis-moi exactement ce qui se passe.",
  ],
  /** Calming urgency */
  calm: [
    "Prends une respiration, on va régler ça.",
    "C'est stressant, mais on a des options.",
    "On va trouver quelqu'un rapidement.",
    "Je suis là, on va avancer.",
  ],
  /** Action-oriented */
  action: [
    "Envoie-moi une photo tout de suite.",
    "Tu veux que je trouve quelqu'un maintenant?",
    "On peut réserver en urgence.",
    "Je lance la recherche.",
  ],
} as const;

// ─── Transitions ───
// Short phrases to connect turns naturally.

export const TRANSITIONS = {
  /** Moving to next topic */
  next: [
    "Bon.",
    "OK.",
    "Parfait.",
    "C'est noté.",
  ],
  /** Wrapping up */
  closing: [
    "On est bon.",
    "C'est en ordre.",
    "Tu sais où me trouver.",
    "Je reste disponible.",
  ],
  /** Clarifying */
  clarify: [
    "Juste pour être sûre.",
    "Tu veux dire...?",
    "Précise-moi ça.",
    "C'est bien ça?",
  ],
} as const;

// ─── Phrase Picker by Mode ───

export interface PhraseContext {
  mode: AlexMode;
  subCategory?: string;
}

/**
 * Get a random phrase appropriate for the given mode and context.
 * Falls back to neutral acknowledgment if category not found.
 */
export function getAlexPhrase(ctx: PhraseContext): string {
  const packs: Record<AlexMode, Record<string, readonly string[]>> = {
    homeowner: HOMEOWNER,
    contractor: CONTRACTOR,
    condo: CONDO,
    urgency: URGENCY,
  };

  const pack = packs[ctx.mode];
  if (!pack) return pick(ACK.neutral);

  const sub = ctx.subCategory;
  if (sub && sub in pack) {
    return pick(pack[sub as keyof typeof pack]);
  }

  // Pick from first available category
  const firstKey = Object.keys(pack)[0];
  return pick(pack[firstKey as keyof typeof pack]);
}

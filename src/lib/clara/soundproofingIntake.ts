/**
 * Clara — parcours « bruit entre logements » (isolation SONORE).
 *
 * Machine d'état pure, utilisée par le fil Clara existant
 * (useAlexConversationLite) : une seule question à la fois, sans jamais
 * inventer de professionnel, de prix, de résultat ou de disponibilité.
 * Elle distingue l'isolation sonore de l'isolation thermique et termine
 * par un constat honnête lorsqu'aucun professionnel vérifié n'est proposé.
 */

export type SoundSurface = "wall" | "floor" | "ceiling";
export type NoiseKind = "airborne" | "impact";
export type PropertyKind = "rental" | "condo" | "plex" | "house" | "apartment";
export type AccessKind = "own_side" | "neighbor_or_common" | "unknown";
export type AuthorizationKind = "granted" | "needed" | "unknown";
export type IntakeStep = "surface" | "noise" | "property" | "territory" | "access" | "authorization" | "done";

export interface SoundproofingIntakeState {
  step: IntakeStep;
  surfaces: SoundSurface[];
  noise: NoiseKind[];
  property: PropertyKind | null;
  territory: string | null;
  access: AccessKind | null;
  authorization: AuthorizationKind | null;
  /** Étapes laissées « à préciser » après une relance sans réponse claire. */
  skipped?: IntakeStep[];
  /** Nombre de relances à l'étape courante (une seule, jamais de boucle). */
  retries?: number;
}

export interface IntakeTurn {
  state: SoundproofingIntakeState | null;
  reply: string;
  /** true = le sujet change; le fil Clara habituel reprend au prochain message. */
  exited?: boolean;
}

const norm = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’]/g, "'");

const SOUND_TOPIC = [
  /insonori/,
  /isolation (sonore|acoustique|phonique)/,
  /\bacoustique/,
  /bruits? (entre|des|du|de mes|de nos) (logements?|voisins?|appartements?|condos?|unites?)/,
  /bruits? d'impact|bruits? aeriens?/,
  /voisins? bruyants?/,
  /j'entends (tout|mes|les|mon|ma|nos) (voisin|voix|pas)/,
  /bruits? de pas/,
];

const THERMAL_CUES = /thermique|chaleur|froid|courants? d'air|chauffage|facture d'electricite|perte de chaleur|condensation|barrage de glace|grenier|entretoit/;
const SOUND_CUES = /bruit|son\b|sonore|acoustique|insonori|entend|voix|musique|tele|pas\b|choc|impact/;

export function isSoundproofingTopic(text: string): boolean {
  const n = norm(text);
  return SOUND_TOPIC.some((p) => p.test(n));
}

/** L'utilisateur précise qu'il parle de chaleur/froid et non de bruit. */
export function isThermalClarification(text: string): boolean {
  const n = norm(text);
  return THERMAL_CUES.test(n) && !SOUND_CUES.test(n);
}

export function parseSurfaces(text: string): SoundSurface[] {
  const n = norm(text);
  const out: SoundSurface[] = [];
  if (/\bmurs?\b|mitoyen|cloison/.test(n)) out.push("wall");
  if (/plancher|en bas|d'en dessous|du dessous|en-dessous|au-dessous|sous-sol/.test(n)) out.push("floor");
  if (/plafond|en haut|d'en haut|du dessus|au-dessus|a l'etage/.test(n)) out.push("ceiling");
  return out;
}

export function parseNoise(text: string): NoiseKind[] {
  const n = norm(text);
  const out: NoiseKind[] = [];
  if (/voix|parle|conversation|tele|television|musique|radio|chien|aboi|cri|aerien/.test(n)) out.push("airborne");
  if (/bruits? de pas|\b(les|des|ses|leurs) pas\b|marche|talons?|chocs?|impacts?|claque|meubles?|saute|course|cogne/.test(n)) out.push("impact");
  return out;
}

export function parseProperty(text: string): PropertyKind | null {
  const n = norm(text);
  if (/condo|copropriete|syndicat/.test(n)) return "condo";
  if (/duplex|triplex|quadruplex|plex\b|multiplex/.test(n)) return "plex";
  if (/locataire|en location|je loue|logement locatif|bail/.test(n)) return "rental";
  if (/appartement|appart\b/.test(n)) return "apartment";
  if (/maison|jumele|en rangee|unifamiliale/.test(n)) return "house";
  return null;
}

export function parseAccess(text: string): AccessKind {
  const n = norm(text);
  if (/voisin|parties? communes?|commun|chez l'autre|les deux cotes/.test(n)) return "neighbor_or_common";
  if (/mon cote|chez moi|chez nous|de mon cote|seulement ici|dans mon logement/.test(n)) return "own_side";
  return "unknown";
}

export function parseAuthorization(text: string): AuthorizationKind {
  const n = norm(text);
  if (/\bnon\b|pas encore|je dois|demander|ne sais pas|aucune idee|pas sur/.test(n)) return "needed";
  if (/\boui\b|accord|autoris|permission|je suis (le |la )?proprietaire|proprietaire occupant/.test(n)) return "granted";
  return "unknown";
}

const QUESTIONS: Record<Exclude<IntakeStep, "done">, string> = {
  surface: "Par où le bruit passe-t-il surtout : un mur mitoyen, le plancher ou le plafond?",
  noise: "Entendez-vous surtout des voix, une télé ou de la musique, ou plutôt des pas et des chocs?",
  property: "De quel type de logement s'agit-il : appartement en location, condo en copropriété, duplex ou triplex, ou maison?",
  territory: "Dans quelle ville ou quel secteur se trouve le logement?",
  access: "Les travaux pourraient-ils se faire seulement de votre côté, ou faudrait-il accéder chez le voisin ou aux parties communes?",
  authorization: "Avez-vous déjà l'accord nécessaire pour des travaux : êtes-vous propriétaire, ou devez-vous obtenir l'autorisation du propriétaire ou du syndicat?",
};

function nextStep(s: SoundproofingIntakeState): IntakeStep {
  const skip = s.skipped || [];
  if (s.surfaces.length === 0 && !skip.includes("surface")) return "surface";
  if (s.noise.length === 0 && !skip.includes("noise")) return "noise";
  if (!s.property && !skip.includes("property")) return "property";
  if (!s.territory) return "territory";
  if (!s.access) return "access";
  if (!s.authorization) return "authorization";
  return "done";
}

const SURFACE_FR: Record<SoundSurface, string> = { wall: "mur mitoyen", floor: "plancher", ceiling: "plafond" };

function pistes(s: SoundproofingIntakeState): string {
  const parts: string[] = [];
  if (s.noise.includes("impact")) {
    parts.push(
      s.surfaces.includes("ceiling")
        ? "Pour des pas venant d'en haut, la correction la plus efficace se fait souvent au plancher du dessus (sous-couche acoustique); de votre côté, un plafond suspendu désolidarisé peut aider."
        : "Pour des bruits d'impact, on regarde surtout la sous-couche acoustique sous le revêtement de plancher.",
    );
  }
  if (s.noise.includes("airborne")) {
    parts.push("Pour des voix ou de la musique, on combine généralement étanchéité acoustique des fuites (prises, cadres, jonctions), laine minérale, gypse supplémentaire et désolidarisation.");
  }
  parts.push("Ces pistes restent à confirmer selon l'assemblage réel et les transmissions latérales.");
  return parts.join(" ");
}

function finalReply(s: SoundproofingIntakeState): string {
  const surfaces = s.surfaces.map((x) => SURFACE_FR[x]).join(", ");
  const lines = [
    `Merci. Je résume : bruit par ${surfaces || "une surface à préciser"}, secteur ${s.territory}.`,
    pistes(s),
  ];
  if (s.property === "condo" || s.property === "plex" || s.property === "rental" || s.property === "apartment" || s.access === "neighbor_or_common") {
    lines.push("Toute ouverture entre deux logements doit préserver la séparation coupe-feu.");
  }
  if (s.property === "condo") lines.push("En copropriété, faites valider le projet par le syndicat avant les travaux, surtout pour un plancher.");
  else if (s.property === "rental" || s.authorization === "needed") lines.push("Obtenez l'accord écrit du propriétaire ou du syndicat avant les travaux.");
  lines.push("Je ne peux pas encore vous proposer un professionnel en insonorisation vérifié pour votre secteur. Je préfère vous le dire plutôt que de vous montrer un nom au hasard.");
  return lines.join(" ");
}

export const NO_VERIFIED_SOUNDPROOFING_PRO =
  "Je ne peux pas encore vous proposer un professionnel en insonorisation vérifié pour votre secteur. Je préfère vous le dire plutôt que de vous montrer un nom au hasard.";

function ask(state: SoundproofingIntakeState, prefix?: string): IntakeTurn {
  const step = nextStep(state);
  const next = { ...state, step, retries: step === state.step ? state.retries : 0 };
  if (step === "done") return { state: next, reply: finalReply(next) };
  return { state: next, reply: prefix ? `${prefix} ${QUESTIONS[step]}` : QUESTIONS[step] };
}

export function startSoundproofingIntake(text: string, knownCity?: string | null): IntakeTurn {
  const base: SoundproofingIntakeState = {
    step: "surface",
    surfaces: parseSurfaces(text),
    noise: parseNoise(text),
    property: parseProperty(text),
    territory: knownCity || null,
    access: null,
    authorization: null,
  };
  return ask(
    base,
    "Je comprends : vous voulez réduire le bruit entre deux logements. On parle ici d'isolation sonore, pas d'isolation thermique (chaleur ou froid).",
  );
}

export function advanceSoundproofingIntake(
  state: SoundproofingIntakeState,
  text: string,
  knownCity?: string | null,
): IntakeTurn {
  if (isThermalClarification(text)) {
    return {
      state: null,
      exited: true,
      reply: "Merci de la précision : il s'agit alors d'isolation thermique (chaleur, froid, courants d'air), pas de bruit. Décrivez-moi ce que vous remarquez et je continue avec vous.",
    };
  }
  if (state.step === "done") return { state, reply: NO_VERIFIED_SOUNDPROOFING_PRO };

  const s: SoundproofingIntakeState = { ...state, surfaces: [...state.surfaces], noise: [...state.noise] };
  // Toute information utile donnée en passant est retenue (évite de redemander).
  for (const x of parseSurfaces(text)) if (!s.surfaces.includes(x)) s.surfaces.push(x);
  for (const x of parseNoise(text)) if (!s.noise.includes(x)) s.noise.push(x);
  s.property = s.property || parseProperty(text);
  if (!s.territory && knownCity) s.territory = knownCity;

  const raw = text.trim().slice(0, 80);
  // Une seule relance par étape; ensuite l'information reste « à préciser ».
  const retryOrSkip = (reply: string): IntakeTurn | null => {
    if (!s.retries) return { state: { ...s, retries: 1 }, reply };
    s.skipped = [...(s.skipped || []), state.step];
    return null;
  };
  let retry: IntakeTurn | null = null;
  switch (state.step) {
    case "surface":
      if (s.surfaces.length === 0) retry = retryOrSkip("Je veux bien comprendre : le bruit vient-il d'un mur, du plancher ou du plafond?");
      break;
    case "noise":
      if (s.noise.length === 0) retry = retryOrSkip("Pour orienter les solutions : est-ce plutôt des voix et de la musique, ou des pas et des chocs?");
      break;
    case "property":
      if (!s.property) retry = retryOrSkip(QUESTIONS.property);
      break;
    case "territory":
      if (!s.territory && raw) s.territory = raw;
      break;
    case "access":
      s.access = parseAccess(text);
      break;
    case "authorization":
      s.authorization = parseAuthorization(text);
      break;
  }
  if (retry) return retry;
  return ask(s);
}

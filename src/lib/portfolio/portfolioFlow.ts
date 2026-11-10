/**
 * Parcours « Montrez vos réalisations » — logique pure des étapes.
 * Photos d'abord (sans compte) → compte → projet (soumission réelle) →
 * mandats recherchés (facultatif) → merci + offre secondaire 350 $.
 * Aucune décision serveur ici : plafond, propriété et modération restent
 * dans les RPC existantes.
 */

export type FlowStep = "intro" | "photos" | "compte" | "projet" | "mandats" | "merci";
export const FLOW_STEPS: FlowStep[] = ["intro", "photos", "compte", "projet", "mandats", "merci"];
/** Étapes affichées dans la barre de progression (l'intro n'en fait pas partie). */
export const PROGRESS_STEPS: Exclude<FlowStep, "intro">[] = ["photos", "compte", "projet", "mandats", "merci"];

export function parseStep(raw: string | null | undefined): FlowStep {
  return FLOW_STEPS.includes(raw as FlowStep) ? (raw as FlowStep) : "intro";
}

export interface FlowState { photoCount: number; signedIn: boolean; submitted: boolean }

/**
 * Étape réellement affichable : on ne saute jamais une condition (photo avant
 * compte, compte avant projet, soumission réelle avant mandats/merci).
 */
export function resolveStep(requested: FlowStep, s: FlowState): FlowStep {
  if (requested === "mandats" || requested === "merci") {
    if (s.submitted && s.signedIn) return requested;
    requested = "projet";
  }
  if (requested === "projet") {
    if (s.photoCount < 1) return "photos";
    return s.signedIn ? "projet" : "compte";
  }
  if (requested === "compte") {
    if (s.photoCount < 1) return "photos";
    return s.signedIn ? "projet" : "compte";
  }
  return requested;
}

/** Après les photos : le pro déjà connecté saute la connexion. */
export function stepAfterPhotos(signedIn: boolean): FlowStep {
  return signedIn ? "projet" : "compte";
}

export function progressIndex(step: FlowStep): number {
  return step === "intro" ? -1 : PROGRESS_STEPS.indexOf(step);
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Suit un index marqué (avant/après) lors d'un déplacement. */
export function remapIndexAfterMove(idx: number | null, from: number, to: number): number | null {
  if (idx === null) return null;
  if (idx === from) return to;
  if (from < idx && to >= idx) return idx - 1;
  if (from > idx && to <= idx) return idx + 1;
  return idx;
}

/** Suit un index marqué lors d'un retrait (null si la photo marquée est retirée). */
export function remapIndexAfterRemove(idx: number | null, removed: number): number | null {
  if (idx === null || idx === removed) return null;
  return idx > removed ? idx - 1 : idx;
}

const SERVICE_HINTS: [RegExp, { fr: string; en: string }][] = [
  [/toit|toiture|bardeau|roof|shingle/i, { fr: "Toiture", en: "Roofing" }],
  [/goutti[eè]re|gutter/i, { fr: "Gouttières", en: "Gutters" }],
  [/cuisine|kitchen/i, { fr: "Rénovation de cuisine", en: "Kitchen renovation" }],
  [/salle de bain|salle de bains|douche|bathroom|shower/i, { fr: "Salle de bain", en: "Bathroom" }],
  [/sous-sol|sous sol|basement/i, { fr: "Sous-sol", en: "Basement" }],
  [/peintur|peint|paint/i, { fr: "Peinture", en: "Painting" }],
  [/pav[ée]|interbloc|paver/i, { fr: "Pavé uni", en: "Pavers" }],
  [/asphalt/i, { fr: "Asphaltage", en: "Asphalt paving" }],
  [/terrasse|patio|balcon|deck/i, { fr: "Terrasse et patio", en: "Deck and patio" }],
  [/cl[ôo]ture|fence/i, { fr: "Clôture", en: "Fence" }],
  [/fen[êe]tre|porte|window|door/i, { fr: "Portes et fenêtres", en: "Doors and windows" }],
  [/isol|insulat/i, { fr: "Isolation", en: "Insulation" }],
  [/drain/i, { fr: "Drain français", en: "French drain" }],
  [/fondation|foundation/i, { fr: "Fondation", en: "Foundation" }],
  [/plancher|c[ée]ramique|parquet|floor|tile/i, { fr: "Revêtement de sol", en: "Flooring" }],
  [/paysag|gazon|haie|landscap|lawn/i, { fr: "Aménagement paysager", en: "Landscaping" }],
  [/brique|ma[çc]on|pierre|masonry|brick/i, { fr: "Maçonnerie", en: "Masonry" }],
  [/thermopompe|climatis|heat pump|air condition/i, { fr: "Thermopompe et climatisation", en: "Heat pump and A/C" }],
  [/[ée]lectri|electric/i, { fr: "Électricité", en: "Electrical" }],
  [/plomb|plumb/i, { fr: "Plomberie", en: "Plumbing" }],
];

/**
 * Suggestion de type de travaux à partir du TEXTE saisi seulement (titre,
 * commentaire). Jamais une analyse de photo; null si rien de clair.
 */
export function suggestService(text: string, lang: "fr" | "en"): string | null {
  const t = (text ?? "").trim();
  if (t.length < 3) return null;
  for (const [re, label] of SERVICE_HINTS) if (re.test(t)) return label[lang];
  return null;
}

function uniqueClean(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const s = (v ?? "").trim();
    if (s.length < 2 || s.length > 80) continue;
    const k = s.toLocaleLowerCase("fr-CA");
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

export interface MandateDraft { services_wanted: string[]; territories: string[]; availability: string | null; project_size: string | null }

/**
 * Présélection : seulement ce que l'entrepreneur a réellement déclaré (type
 * de travaux du projet, métier de sa fiche, réponses déjà enregistrées) —
 * jamais une catégorie devinée.
 */
export function mandateDefaults(input: {
  serviceName?: string | null; specialty?: string | null; city?: string | null;
  existing?: Partial<Record<keyof MandateDraft, unknown>> | null;
}): MandateDraft {
  const ex = input.existing ?? {};
  const arr = (v: unknown) => (Array.isArray(v) ? v.map((x) => String(x)) : []);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
  return {
    services_wanted: uniqueClean([...arr(ex.services_wanted), input.serviceName, input.specialty]),
    territories: uniqueClean([...arr(ex.territories), input.city]),
    availability: str(ex.availability),
    project_size: str(ex.project_size),
  };
}

/** Rien n'est enregistré tant qu'aucune préférence réelle n'est choisie. */
export function mandateHasAnswers(m: MandateDraft): boolean {
  return m.services_wanted.length > 0 || m.territories.length > 0 || !!m.availability || !!m.project_size;
}

// ---- Dernière soumission (session) : permet retour arrière/reload vers mandats/merci.
const LAST_KEY = "unpro_portfolio_last_submit_v1";
export interface LastSubmission { id: string; status: string; serviceName: string; city: string; at: number }

export function saveLastSubmission(s: LastSubmission) {
  try { sessionStorage.setItem(LAST_KEY, JSON.stringify(s)); } catch { /* noop */ }
}
export function readLastSubmission(): LastSubmission | null {
  try {
    const raw = sessionStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as LastSubmission;
    return p?.id ? p : null;
  } catch { return null; }
}
export function clearLastSubmission() { try { sessionStorage.removeItem(LAST_KEY); } catch { /* noop */ } }

/**
 * UNPRO — Matching profile questions.
 *
 * These are the questions that actually drive UNPRO matching (service,
 * territory, availability, project fit, verification). No directory fluff, no
 * financial metrics a contractor is unlikely to know. One question at a time
 * on mobile; every answer is saved progressively.
 *
 * Keep the field keys in sync with supabase/functions/matching-profile.
 */

export type MatchingFieldKey =
  | "services_wanted"
  | "services_refused"
  | "territories"
  | "project_size"
  | "client_type"
  | "availability"
  | "languages"
  | "credentials"
  | "differentiators"
  /** Optionnel, spécifique à certains métiers — ne bloque jamais la complétion. */
  | "emergency";

export type QuestionKind = "multi" | "single" | "text" | "chips";

export interface MatchingQuestion {
  key: MatchingFieldKey;
  /** FR is primary. */
  label: string;
  label_en: string;
  help?: string;
  help_en?: string;
  kind: QuestionKind;
  options?: { value: string; label: string; label_en: string }[];
  placeholder?: string;
  /** Optional questions never block completion of the required set. */
  optional?: boolean;
  /** Only asked for these trade families (substring match, case-insensitive). */
  onlyForTrades?: string[];
}

export const REQUIRED_MATCHING_FIELDS: MatchingFieldKey[] = [
  "services_wanted",
  "services_refused",
  "territories",
  "project_size",
  "client_type",
  "availability",
  "languages",
  "credentials",
  "differentiators",
];

const SIZE_OPTIONS = [
  { value: "unknown", label: "Je ne sais pas encore", label_en: "Not sure yet" },
  { value: "lt_2k", label: "Moins de 2 000 $", label_en: "Under $2,000" },
  { value: "2k_10k", label: "2 000 $ – 10 000 $", label_en: "$2,000 – $10,000" },
  { value: "10k_50k", label: "10 000 $ – 50 000 $", label_en: "$10,000 – $50,000" },
  { value: "gt_50k", label: "Plus de 50 000 $", label_en: "Over $50,000" },
];

export const MATCHING_QUESTIONS: MatchingQuestion[] = [
  {
    key: "services_wanted",
    label: "Quels services voulez-vous faire davantage ?",
    label_en: "Which services do you want more of?",
    help: "Ce sont les projets que notre moteur vous proposera en priorité.",
    help_en: "These are the projects our engine will consider you for first.",
    kind: "chips",
    placeholder: "Ex. toiture bardeau, drain français, isolation…",
  },
  {
    key: "services_refused",
    label: "Quels travaux ne voulez-vous PAS recevoir ?",
    label_en: "Which jobs do you NOT want?",
    help: "Aussi important que le reste : ça évite les mauvais rendez-vous.",
    help_en: "Just as important: it prevents bad appointments.",
    kind: "chips",
    placeholder: "Ex. petites réparations, urgences de nuit…",
  },
  {
    key: "territories",
    label: "Quels territoires desservez-vous ?",
    label_en: "Which territories do you serve?",
    help: "Villes, quartiers ou rayon autour de votre base.",
    help_en: "Cities, neighbourhoods or radius around your base.",
    kind: "chips",
    placeholder: "Ex. Laval, Montréal, rayon 40 km…",
  },
  {
    key: "project_size",
    label: "Valeur minimale d'un projet qui vaut votre déplacement ?",
    label_en: "Minimum project value worth your trip?",
    kind: "single",
    options: SIZE_OPTIONS,
  },
  {
    key: "client_type",
    label: "Vous travaillez pour…",
    label_en: "You work for…",
    kind: "single",
    options: [
      { value: "residential", label: "Résidentiel", label_en: "Residential" },
      { value: "commercial", label: "Commercial", label_en: "Commercial" },
      { value: "both", label: "Les deux", label_en: "Both" },
    ],
  },
  {
    key: "availability",
    label: "Votre prochaine disponibilité réelle ?",
    label_en: "Your next real availability?",
    help: "Utilisé pour ne vous envoyer que des rendez-vous que vous pouvez prendre.",
    help_en: "Used so we only send appointments you can actually take.",
    kind: "single",
    options: [
      { value: "this_week", label: "Cette semaine", label_en: "This week" },
      { value: "2_weeks", label: "D'ici 2 semaines", label_en: "Within 2 weeks" },
      { value: "1_month", label: "D'ici 1 mois", label_en: "Within a month" },
      { value: "next_season", label: "Prochaine saison", label_en: "Next season" },
    ],
  },
  {
    key: "emergency",
    label: "Faites-vous des urgences ?",
    label_en: "Do you take emergencies?",
    kind: "single",
    optional: true,
    onlyForTrades: ["plomb", "élect", "elect", "toit", "chauff", "clim", "drain", "sinistre"],
    options: [
      { value: "yes_24_7", label: "Oui, 24/7", label_en: "Yes, 24/7" },
      { value: "yes_hours", label: "Oui, heures ouvrables", label_en: "Yes, business hours" },
      { value: "no", label: "Non", label_en: "No" },
    ],
  } as MatchingQuestion,
  {
    key: "languages",
    label: "Dans quelles langues servez-vous vos clients ?",
    label_en: "Which languages do you serve clients in?",
    kind: "multi",
    options: [
      { value: "fr", label: "Français", label_en: "French" },
      { value: "en", label: "Anglais", label_en: "English" },
      { value: "es", label: "Espagnol", label_en: "Spanish" },
      { value: "other", label: "Autre", label_en: "Other" },
    ],
  },
  {
    key: "credentials",
    label: "Vos licences et couvertures",
    label_en: "Your licences and coverage",
    help: "Confirmez seulement ce que vous détenez réellement.",
    help_en: "Only confirm what you actually hold.",
    kind: "multi",
    options: [
      { value: "rbq", label: "Licence RBQ", label_en: "RBQ licence" },
      { value: "insurance", label: "Assurance responsabilité", label_en: "Liability insurance" },
      { value: "cnesst", label: "CNESST à jour", label_en: "CNESST up to date" },
      { value: "warranty", label: "Garantie sur travaux", label_en: "Workmanship warranty" },
      { value: "none", label: "Aucune pour l'instant", label_en: "None for now" },
    ],
  },
  {
    key: "differentiators",
    label: "3 choses qui vous distinguent",
    label_en: "3 things that set you apart",
    help: "Ce que vous diriez à un client sur place.",
    help_en: "What you'd tell a client on site.",
    kind: "chips",
    placeholder: "Ex. 20 ans d'expérience, devis en 24 h…",
  },
];

export function questionsForTrade(trade?: string | null): MatchingQuestion[] {
  const t = (trade ?? "").toLowerCase();
  return MATCHING_QUESTIONS.filter(
    (q) => !q.onlyForTrades || q.onlyForTrades.some((frag) => t.includes(frag)),
  );
}

export function isAnswered(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "object") return Object.keys(v as Record<string, unknown>).length > 0;
  return true;
}

/** Same deterministic maths as the edge function, for optimistic UI only. */
export function completionOf(answers: Record<string, unknown>): number {
  const answered = REQUIRED_MATCHING_FIELDS.filter((f) => isAnswered(answers[f])).length;
  return Math.round((answered / REQUIRED_MATCHING_FIELDS.length) * 100);
}

export function missingMatchingFields(answers: Record<string, unknown>): MatchingFieldKey[] {
  return REQUIRED_MATCHING_FIELDS.filter((f) => !isAnswered(answers[f]));
}

export const MATCHING_FIELD_LABELS: Record<MatchingFieldKey, string> = {
  services_wanted: "Services recherchés",
  services_refused: "Travaux refusés",
  territories: "Territoires desservis",
  project_size: "Taille de projet",
  client_type: "Type de clientèle",
  emergency: "Service d'urgence",
  availability: "Disponibilité",
  languages: "Langues",
  credentials: "Licences et couvertures",
  differentiators: "Différenciateurs",
};

/**
 * "Vous êtes pas tannés?" campaign — approved FR copy + natural EN equivalent.
 * Destinations reuse existing flows only: homeowner Clara (home campaign
 * intent) and the canonical website-first contractor profile entry.
 */
import { contractorProfileEntryPath } from "@/lib/contractorProfileEntry";
import { CONTRACTOR_MARKETING_FIELDS } from "@/lib/analytics/contractorAdTracking";

export type TannesPersona = "homeowner" | "contractor";
export const TANNES_PATH = "/tannes";
export const TANNES_CHOICE_PARAM = "choix";
const CHOICE_VALUES: Record<TannesPersona, string> = { homeowner: "proprietaire", contractor: "entrepreneur" };
const STORAGE_KEY = "unpro_tannes_persona";

export const TANNES_COPY = {
  fr: {
    title: "Vous êtes pas tannés? | UNPRO",
    description: "De chercher pendant des heures. De soumissionner pour rien. En rénovation, tout le monde mérite de mieux investir son temps.",
    headline: "Vous êtes pas tannés?",
    subhead: "De chercher pendant des heures. De soumissionner pour rien. En rénovation, tout le monde mérite de mieux investir son temps.",
    chooseLabel: "Choisissez votre situation",
    homeowner: {
      label: "Je cherche un pro",
      pain: "Tanné de chercher, d’appeler et de comparer sans savoir qui choisir?",
      payoff: "Trouvez un pro qui comprend votre projet.",
      choose: "Trouver mon pro",
      detailTitle: "Le premier sur Google est-il le bon pour vous?",
      detail: [
        "Vous voulez rénover votre cuisine. Pas passer vos soirées à départager les publicités, rappeler des entreprises et déchiffrer cinq soumissions.",
        "Expliquez votre projet à Clara. Elle vous aide à préciser vos besoins et à trouver un professionnel compatible avec votre situation.",
      ],
      cta: "Expliquer mon projet à Clara",
    },
    contractor: {
      label: "Je suis entrepreneur",
      pain: "Tanné des déplacements inutiles, des soumissions sans réponse et des suivis interminables?",
      payoff: "Visez des mandats qui correspondent à votre entreprise.",
      choose: "Obtenir de meilleurs mandats",
      detailTitle: "Votre temps vaut plus qu’une soumission sans réponse.",
      detail: [
        "Vous connaissez ça : le déplacement, les mesures, le prix, le courriel… puis plus rien. Et pendant ce temps, les bons mandats attendent.",
        "Faites connaître à Clara vos services, votre territoire et les travaux que vous voulez vraiment réaliser. UNPRO utilise ces informations pour vous proposer des occasions pertinentes et des rendez-vous exclusifs qualifiés.",
      ],
      cta: "Présenter mon entreprise à Clara",
    },
    change: "Changer de choix",
    switchTo: { homeowner: "Vous êtes plutôt entrepreneur?", contractor: "Vous cherchez plutôt un pro?" },
    signature: "UNPRO — Innovation, construction, entretien, services",
    tagline: "Le bon pro. Le bon projet.",
  },
  en: {
    title: "Aren’t you tired of it? | UNPRO",
    description: "Of searching for hours. Of quoting for nothing. In renovation, everyone deserves to make better use of their time.",
    headline: "Aren’t you tired of it?",
    subhead: "Of searching for hours. Of quoting for nothing. In renovation, everyone deserves to make better use of their time.",
    chooseLabel: "Choose your situation",
    homeowner: {
      label: "I’m looking for a pro",
      pain: "Tired of searching, calling and comparing without knowing who to choose?",
      payoff: "Find a pro who understands your project.",
      choose: "Find my pro",
      detailTitle: "Is the top result on Google the right one for you?",
      detail: [
        "You want to renovate your kitchen. Not spend your evenings sorting through ads, calling companies back and decoding five quotes.",
        "Explain your project to Clara. She helps you clarify your needs and find a professional who fits your situation.",
      ],
      cta: "Explain my project to Clara",
    },
    contractor: {
      label: "I’m a contractor",
      pain: "Tired of wasted trips, unanswered quotes and endless follow-ups?",
      payoff: "Aim for jobs that fit your business.",
      choose: "Get better jobs",
      detailTitle: "Your time is worth more than an unanswered quote.",
      detail: [
        "You know the drill: the trip, the measurements, the price, the email… then nothing. Meanwhile, the right jobs are waiting.",
        "Tell Clara about your services, your service area and the work you really want to do. UNPRO uses this information to offer you relevant opportunities and qualified exclusive appointments.",
      ],
      cta: "Introduce my business to Clara",
    },
    change: "Change my choice",
    switchTo: { homeowner: "Are you a contractor instead?", contractor: "Looking for a pro instead?" },
    signature: "UNPRO — Innovation, construction, maintenance, services",
    tagline: "The right pro. The right project.",
  },
} as const;

export function parseTannesChoice(value: string | null): TannesPersona | null {
  if (value === CHOICE_VALUES.homeowner) return "homeowner";
  if (value === CHOICE_VALUES.contractor) return "contractor";
  return null;
}
export const tannesChoiceValue = (persona: TannesPersona) => CHOICE_VALUES[persona];

export function rememberTannesChoice(persona: TannesPersona | null) {
  try { persona ? sessionStorage.setItem(STORAGE_KEY, persona) : sessionStorage.removeItem(STORAGE_KEY); } catch { /* URL stays the source */ }
}
export function readTannesChoice(): TannesPersona | null {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    return v === "homeowner" || v === "contractor" ? v : null;
  } catch { return null; }
}

/** Only marketing attribution leaves this page; never the persona param or anything else. */
export function tannesAttribution(search: string): URLSearchParams {
  const source = new URLSearchParams(search);
  const out = new URLSearchParams();
  for (const key of CONTRACTOR_MARKETING_FIELDS) {
    const value = source.get(key)?.trim();
    if (value) out.set(key, value);
  }
  if (!out.has("utm_campaign")) out.set("utm_campaign", "tannes");
  return out;
}

/** Existing homeowner Clara entry: the home campaign intent sets the homeowner audience. */
export function tannesHomeownerPath(search: string): string {
  const params = new URLSearchParams({ intent: "economies-100m" });
  tannesAttribution(search).forEach((value, key) => params.set(key, value));
  return `/?${params.toString()}`;
}

/** Canonical website-first contractor entry (matching profile wizard). */
export function tannesContractorPath(search: string, lang: "fr" | "en"): string {
  return contractorProfileEntryPath(`?${tannesAttribution(search).toString()}`, lang);
}

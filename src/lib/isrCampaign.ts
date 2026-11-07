/**
 * Isolation Solution Royal — advertising landing campaigns (pure logic).
 *
 * The contractor is always resolved from the public profile RPC by slug;
 * no contractor ID is hardcoded here. Requests stay bound to that company
 * from landing → intake → sign-in → saved request.
 */

export const ISR_SLUG = "isolation-solution-royal";
export const ISR_DRAFT_KEY = "unpro_isr_campaign_draft";
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export type IsrLang = "fr" | "en";
export type IsrCampaignKey = "entretoit" | "maison-froide" | "ventilation";

const SLUGS: Record<IsrCampaignKey, Record<IsrLang, string>> = {
  entretoit: { fr: "isolation-entretoit", en: "attic-insulation" },
  "maison-froide": { fr: "maison-froide", en: "cold-home" },
  ventilation: { fr: "ventilation-barrages-glace", en: "attic-ventilation-ice-dams" },
};

export const ISR_CAMPAIGN_KEYS = Object.keys(SLUGS) as IsrCampaignKey[];

export function isrCampaignSlug(key: IsrCampaignKey, lang: IsrLang): string {
  return SLUGS[key][lang];
}

export function resolveIsrCampaign(contractorSlug: string, intentSlug: string): { key: IsrCampaignKey; lang: IsrLang } | null {
  if (contractorSlug !== ISR_SLUG) return null;
  for (const key of ISR_CAMPAIGN_KEYS) {
    for (const lang of ["fr", "en"] as IsrLang[]) if (SLUGS[key][lang] === intentSlug) return { key, lang };
  }
  return null;
}

export function isrCampaignPath(key: IsrCampaignKey, lang: IsrLang): string {
  return `/c/${ISR_SLUG}/${isrCampaignSlug(key, lang)}`;
}

/** Ad link with UTM attribution. Values are fixed labels, never personal data. */
export function isrCampaignLink(origin: string, key: IsrCampaignKey, lang: IsrLang, source: string, medium: string): string {
  const params = new URLSearchParams({ utm_source: source, utm_medium: medium, utm_campaign: `isr_${key}` });
  return `${origin.replace(/\/$/, "")}${isrCampaignPath(key, lang)}?${params.toString()}`;
}

type Copy = { eyebrow: string; title: string; subtitle: string };
export const ISR_COPY: Record<IsrCampaignKey, Record<IsrLang, Copy>> = {
  entretoit: {
    fr: { eyebrow: "Isolation d’entretoit", title: "Votre maison perd de la chaleur? Faites évaluer votre entretoit.", subtitle: "Isolation Solution Royal évalue l’isolation et la ventilation de votre entretoit, puis vous propose les travaux adaptés à votre maison." },
    en: { eyebrow: "Attic insulation", title: "Is your home losing heat? Have your attic assessed.", subtitle: "Isolation Solution Royal assesses your attic insulation and ventilation, then proposes the work that fits your home." },
  },
  "maison-froide": {
    fr: { eyebrow: "Maison froide · perte de chaleur", title: "Votre maison perd de la chaleur? Faites évaluer votre entretoit.", subtitle: "Pièces froides à l’étage, chauffage qui roule sans arrêt? L’entretoit est souvent le premier endroit à vérifier." },
    en: { eyebrow: "Cold home · heat loss", title: "Is your home losing heat? Have your attic assessed.", subtitle: "Cold upstairs rooms, heating that never stops? The attic is often the first place to check." },
  },
  ventilation: {
    fr: { eyebrow: "Ventilation · barrages de glace", title: "Glaçons ou barrages de glace sur le toit? Faites évaluer votre entretoit.", subtitle: "Une ventilation insuffisante et des soffites bloqués peuvent favoriser les barrages de glace. Isolation Solution Royal vérifie la ventilation de votre entretoit." },
    en: { eyebrow: "Ventilation · ice dams", title: "Icicles or ice dams on your roof? Have your attic assessed.", subtitle: "Poor ventilation and blocked soffits can contribute to ice dams. Isolation Solution Royal checks your attic ventilation." },
  },
};

/** Services declared by the owner for these campaigns — nothing else is offered. */
export const ISR_DECLARED_SERVICES: Record<IsrLang, string[]> = {
  fr: ["Isolation d’entretoit à la fibre de verre soufflée", "Ventilation d’entretoit", "Dégagement des soffites et déflecteurs", "Trappe d’entretoit isolée et coupe-froid"],
  en: ["Blown fiberglass attic insulation", "Attic ventilation", "Soffit clearing and baffles", "Insulated attic hatch and weatherstripping"],
};

type Option = { value: string; fr: string; en: string };
export const ISR_CONCERNS: Record<IsrCampaignKey, Option[]> = {
  entretoit: [
    { value: "insulation_level", fr: "Je veux vérifier l’isolation de mon entretoit", en: "I want my attic insulation checked" },
    { value: "heat_bills", fr: "Mes coûts de chauffage me semblent élevés", en: "My heating costs seem high" },
    { value: "cold_rooms", fr: "Certaines pièces restent froides", en: "Some rooms stay cold" },
    { value: "other", fr: "Autre question sur mon entretoit", en: "Another attic question" },
  ],
  "maison-froide": [
    { value: "cold_rooms", fr: "Pièces froides à l’étage", en: "Cold rooms upstairs" },
    { value: "heat_bills", fr: "Chauffage qui roule beaucoup", en: "Heating runs a lot" },
    { value: "drafts", fr: "Courants d’air près de la trappe d’entretoit", en: "Drafts near the attic hatch" },
    { value: "other", fr: "Autre", en: "Other" },
  ],
  ventilation: [
    { value: "ice_dams", fr: "Barrages de glace ou gros glaçons", en: "Ice dams or large icicles" },
    { value: "attic_frost", fr: "Givre ou humidité dans l’entretoit", en: "Frost or moisture in the attic" },
    { value: "soffits", fr: "Soffites possiblement bloqués", en: "Soffits possibly blocked" },
    { value: "other", fr: "Autre", en: "Other" },
  ],
};

export const ISR_TIMING: Option[] = [
  { value: "asap", fr: "Dès que possible", en: "As soon as possible" },
  { value: "month", fr: "Dans le mois", en: "Within a month" },
  { value: "planning", fr: "Je planifie pour plus tard", en: "Planning for later" },
];

export const ISR_AVAILABILITY: Option[] = [
  { value: "morning", fr: "En matinée", en: "Mornings" },
  { value: "afternoon", fr: "En après-midi", en: "Afternoons" },
  { value: "evening", fr: "En soirée", en: "Evenings" },
  { value: "flexible", fr: "Flexible", en: "Flexible" },
];

export function optionLabel(options: Option[], value: string | null | undefined, lang: IsrLang): string {
  const o = options.find(item => item.value === value);
  return o ? o[lang] : "";
}

export type IsrAttribution = { utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_term: string | null; utm_content: string | null; gclid: string | null };
export type IsrAnswers = { address: string; city: string; addressId: string | null; concern: string | null; timing: string | null; availability: string | null };
export type IsrDraft = {
  v: 1;
  contractorSlug: typeof ISR_SLUG;
  campaign: IsrCampaignKey;
  lang: IsrLang;
  attribution: IsrAttribution;
  answers: IsrAnswers;
  step: number;
  savedAt: number;
  /** Set only after the server returned the saved request id. */
  requestId: string | null;
};

const ATTR_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"] as const;

export function attributionFrom(search: URLSearchParams): IsrAttribution {
  const out = {} as IsrAttribution;
  for (const k of ATTR_KEYS) {
    const v = search.get(k);
    out[k] = v && v.length <= 200 ? v : null;
  }
  return out;
}

export function emptyAnswers(): IsrAnswers {
  return { address: "", city: "", addressId: null, concern: null, timing: null, availability: null };
}

export const ISR_QUESTION_COUNT = 4;

/** First unanswered question index (0-3), or 4 when ready to send. */
export function nextQuestion(a: IsrAnswers, campaign: IsrCampaignKey): number {
  if (!a.addressId && !(a.address.trim() && a.city.trim())) return 0;
  if (!a.concern || !ISR_CONCERNS[campaign].some(o => o.value === a.concern)) return 1;
  if (!a.timing || !ISR_TIMING.some(o => o.value === a.timing)) return 2;
  if (!a.availability || !ISR_AVAILABILITY.some(o => o.value === a.availability)) return 3;
  return 4;
}

const str = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v : null);

/** Strict restore: anything malformed, expired or for another company is dropped. */
export function parseIsrDraft(raw: string | null, now = Date.now()): IsrDraft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || d.v !== 1 || d.contractorSlug !== ISR_SLUG) return null;
    if (!ISR_CAMPAIGN_KEYS.includes(d.campaign) || (d.lang !== "fr" && d.lang !== "en")) return null;
    if (typeof d.savedAt !== "number" || now - d.savedAt > DRAFT_TTL_MS || d.savedAt > now + 60_000) return null;
    const a = d.answers ?? {};
    const answers: IsrAnswers = {
      address: str(a.address, 300) ?? "", city: str(a.city, 120) ?? "",
      addressId: str(a.addressId, 64), concern: str(a.concern, 40), timing: str(a.timing, 40), availability: str(a.availability, 40),
    };
    const attribution = {} as IsrAttribution;
    for (const k of ATTR_KEYS) attribution[k] = str(d.attribution?.[k], 200);
    return { v: 1, contractorSlug: ISR_SLUG, campaign: d.campaign, lang: d.lang, attribution, answers, step: nextQuestion(answers, d.campaign), savedAt: d.savedAt, requestId: str(d.requestId, 64) };
  } catch {
    return null;
  }
}

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");

/** true / false against the company's published areas; null when areas are unknown. */
export function cityInTerritory(city: string, areas: string[] | null | undefined): boolean | null {
  if (!areas || areas.length === 0 || !city.trim()) return null;
  const c = fold(city);
  return areas.some(area => fold(area) === c);
}

export type IsrProfileGate = {
  contractorId: string | null;
  slug: string | null;
  publicStatus: string | null;
  bookingEnabled: boolean | null;
  accepting: boolean | null;
};

/** Online requests open only for the resolved company with booking enabled server-side. */
export function isrRequestsOpen(p: IsrProfileGate | null): boolean {
  if (!p || !p.contractorId || p.slug !== ISR_SLUG) return false;
  if (p.publicStatus !== "published_pending_verification" && p.publicStatus !== "verified_active") return false;
  return p.bookingEnabled === true && p.accepting === true;
}

/** Appointment request row. Always "requested": a slot is never implied. */
export function buildIsrRequest(input: { userId: string; contractorId: string; addressId: string; draft: IsrDraft }) {
  const { draft } = input;
  const a = draft.answers;
  const concern = optionLabel(ISR_CONCERNS[draft.campaign], a.concern, "fr");
  return {
    homeowner_user_id: input.userId,
    contractor_id: input.contractorId,
    address_id: input.addressId,
    status: "requested" as const,
    project_category: "Isolation",
    problem_summary: `${ISR_COPY[draft.campaign].fr.eyebrow} — ${concern}`,
    timeline: optionLabel(ISR_TIMING, a.timing, "fr"),
    urgency_level: a.timing === "asap" ? "high" : "normal",
    preferred_time_window: optionLabel(ISR_AVAILABILITY, a.availability, "fr"),
    source_page: isrCampaignPath(draft.campaign, draft.lang),
    notes: draft.attribution.utm_campaign ? `Campagne UNPRO : ${draft.attribution.utm_campaign}` : "Campagne UNPRO",
  };
}

/** Event metadata: campaign labels only, never address, contact or free text. */
export function isrEventMetadata(draft: Pick<IsrDraft, "campaign" | "lang" | "attribution">) {
  return { contractor_slug: ISR_SLUG, campaign: draft.campaign, lang: draft.lang, utm_source: draft.attribution.utm_source, utm_medium: draft.attribution.utm_medium, utm_campaign: draft.attribution.utm_campaign };
}

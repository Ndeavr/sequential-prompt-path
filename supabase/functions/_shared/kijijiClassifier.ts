// UNPRO — Kijiji Home Services classifier
// Pure functions, Deno + browser compatible.

export type ListingIntent =
  | "provider_offering_service"
  | "customer_requesting_service"
  | "employment"
  | "product_sale"
  | "unclear";

export type RejectionReason =
  | "massage_or_body_service"
  | "beauty_or_personal_care"
  | "adult_or_companionship"
  | "financial_service"
  | "non_home_service"
  | "job_seeker"
  | "customer_request"
  | "material_sale_only"
  | "vehicle_service"
  | "duplicate"
  | "insufficient_contact_data"
  | "outside_target_region"
  | "source_blocked"
  | null;

// ---- Exclusion keywords (hard reject) ---------------------------------------

export const MASSAGE_KEYWORDS = [
  "massage", "massotherapie", "massothérapie", "massotherapist", "massothérapeute",
  "massage therapist", "rmt ", " rmt", "cmt ", " cmt",
  "body massage", "body to body", "body-to-body",
  "relaxation massage", "deep tissue", "swedish massage",
  "thai massage", "asian massage", "chinese massage", "indian massage",
  "mobile massage", "male massage", "male to male massage", "female massage",
  "sensual massage", "erotic massage", "tantric massage",
  "spa massage", "massage parlour", "massage parlor",
  "happy ending", "shower room", "incall", "outcall",
];

export const BEAUTY_KEYWORDS = [
  "hair salon", "haircut", "coiffure", "coiffeur", "coiffeuse",
  "nails", "manucure", "pedicure", "pédicure", "ongles",
  "waxing", "epilation", "épilation",
  "esthetic", "esthétique", "esthetics",
  "tattoo", "tatouage", "piercing",
  "eyelash", "cils", "microblading", "botox",
];

export const ADULT_KEYWORDS = [
  "escort", "companionship", "companion service",
  "adult service", "adult entertainment", "erotic",
  "dating service", "sugar baby",
];

export const NON_HOME_KEYWORDS = [
  "acupuncture", "psychic", "tarot", "spiritual healing",
  "personal trainer", "coach de vie", "life coach",
  "loan", "prêt", "bookkeeping", "comptabilité", "comptable",
  "legal service", "avocat", "notaire", "notary",
  "web design", "digital marketing", "seo service", "logo design",
  "tutoring", "tutorat", "music lesson", "cours de musique",
  "airport ride", "taxi", "vehicle delivery",
  "car repair", "auto repair", "mécanique auto", "mecanique auto",
  "pet grooming", "toilettage", "dog walking",
  "childcare", "garderie", "babysitting", "gardienne",
  "caregiver", "personal care",
];

export const JOB_SEEKER_PHRASES = [
  "looking for work", "je cherche du travail", "seeking employment",
  "recherche emploi", "je cherche un emploi", "cv disponible",
  "resume available", "à la recherche d'un emploi",
];

export const CUSTOMER_REQUEST_PHRASES = [
  "looking for", "looking to hire", "need contractor", "need a plumber",
  "need an electrician", "wanted", "quote wanted", "seeking contractor",
  "cherche quelqu'un", "je recherche", "besoin de", "je cherche un",
  "j'ai besoin", "avons besoin", "on cherche",
];

export const PROVIDER_PHRASES = [
  "we offer", "nous offrons", "j'offre mes services", "i offer",
  "call or text", "appelez ou textez", "free estimate", "estimation gratuite",
  "licensed contractor", "rbq", "insured", "assuré", "assure",
  "years of experience", "ans d'expérience", "annees d'experience",
  "service area", "secteur", "we specialize", "nous nous spécialisons",
  "réparation", "reparation", "installation",
  "entrepreneur", "compagnie", "équipe", "equipe",
  "professionnel", "professionel",
];

// ---- Home-service canonical categories (EN + FR synonyms) -------------------

type CategorySpec = { canonical: string; keywords: string[]; strategic?: boolean };

export const HOME_SERVICE_CATEGORIES: CategorySpec[] = [
  { canonical: "roofing", strategic: true, keywords: ["roofing","roof repair","roofer","toiture","couvreur","couverture","toit"] },
  { canonical: "insulation", strategic: true, keywords: ["insulation","attic insulation","isolation","entretoit","isolant"] },
  { canonical: "hvac", strategic: true, keywords: ["hvac","heat pump","air conditioning","furnace","thermopompe","climatisation","chauffage","ac repair"] },
  { canonical: "plumbing", strategic: true, keywords: ["plumbing","plumber","plombier","plomberie","drain","débouchage","debouchage"] },
  { canonical: "electrical", strategic: true, keywords: ["electrical","electrician","electricien","électricien","électricité","electricite","ev charger","borne electrique"] },
  { canonical: "foundation", strategic: true, keywords: ["foundation repair","fondation","fissure","crack repair"] },
  { canonical: "waterproofing", strategic: true, keywords: ["waterproofing","imperméabilisation","impermeabilisation","french drain","drain français","drain francais"] },
  { canonical: "mold_remediation", strategic: true, keywords: ["mold remediation","moisissure","décontamination","decontamination","asbestos","amiante","vermiculite"] },
  { canonical: "windows_doors", strategic: true, keywords: ["window","door","fenêtre","fenetre","porte","garage door","porte de garage"] },
  { canonical: "pest_control", strategic: true, keywords: ["pest control","exterminator","extermination","exterminateur","wildlife removal"] },
  { canonical: "landscaping", strategic: true, keywords: ["landscaping","lawn care","aménagement paysager","amenagement paysager","paysagiste","pelouse","tree removal","arborist","arboriste","abattage"] },
  { canonical: "moving", strategic: true, keywords: ["moving","déménagement","demenagement","déménageur","demenageur"] },
  { canonical: "cleaning", strategic: true, keywords: ["cleaning service","residential cleaning","entretien ménager","entretien menager","ménage","menage","housekeeping","post-construction cleaning","window cleaning","lavage de vitres","pressure washing","lavage à pression"] },
  { canonical: "renovation", keywords: ["renovation","rénovation","general contractor","entrepreneur général","handyman","homme à tout faire","bricoleur","drywall","gypse","plaster","plâtre","platre"] },
  { canonical: "painting", keywords: ["painting","painter","peinture","peintre"] },
  { canonical: "flooring", keywords: ["flooring","hardwood","tile installation","plancher","céramique","ceramique","carrelage"] },
  { canonical: "kitchen_bath", keywords: ["kitchen renovation","bathroom renovation","cuisine","salle de bain","basement finishing","sous-sol"] },
  { canonical: "locksmith", keywords: ["locksmith","serrurier"] },
  { canonical: "masonry", keywords: ["masonry","brick repair","maçonnerie","maconnerie","brique","concrete","béton","beton","asphalt","paving","pavé uni","pave uni","interlock"] },
  { canonical: "snow_removal", keywords: ["snow removal","déneigement","deneigement"] },
  { canonical: "pool_spa", keywords: ["pool service","spa maintenance","piscine","hot tub repair","hot-tub"] },
  { canonical: "fence_deck", keywords: ["fence installation","clôture","cloture","deck construction","terrasse","shed installation","cabanon"] },
  { canonical: "junk_removal", keywords: ["junk removal","bin rental","débarras","debarras","conteneur"] },
  { canonical: "chimney", keywords: ["chimney cleaning","chimney repair","cheminée","cheminee","ramonage"] },
  { canonical: "septic_well", keywords: ["septic","fosse septique","water treatment","well service","puits"] },
  { canonical: "inspection", keywords: ["home inspection","building inspection","inspection de bâtiment","inspection de batiment","inspecteur"] },
  { canonical: "restoration", strategic: true, keywords: ["disaster restoration","water damage","dégât d'eau","degat d'eau","fire restoration","sinistre","after-sinistre"] },
  { canonical: "gutters", keywords: ["gutter","soffit","fascia","gouttière","gouttiere","soffite"] },
];

const STRATEGIC_CATEGORIES = new Set(
  HOME_SERVICE_CATEGORIES.filter(c => c.strategic).map(c => c.canonical),
);

// ---- Language detection -----------------------------------------------------

export function detectLanguage(text: string): "fr" | "en" | "mixed" | "unknown" {
  const t = text.toLowerCase();
  const frHits = (t.match(/\b(le|la|les|des|nous|vous|est|pour|avec|dans|sur|offre|service|entrepreneur|à|é|è|ê|ç|ô)\b|[àâéèêëïîôùûüç]/gi) || []).length;
  const enHits = (t.match(/\b(the|and|for|with|our|your|we|you|service|contractor|call|text|free)\b/gi) || []).length;
  if (frHits === 0 && enHits === 0) return "unknown";
  if (frHits > enHits * 1.5) return "fr";
  if (enHits > frHits * 1.5) return "en";
  return "mixed";
}

// ---- Core classifier --------------------------------------------------------

export interface ClassifyInput {
  title: string;
  description?: string | null;
  category?: string | null;
  city?: string | null;
  province?: string | null;
}

export interface ClassifyResult {
  intent: ListingIntent;
  primary_category: string | null;
  secondary_categories: string[];
  services_detected: string[];
  language: "fr" | "en" | "mixed" | "unknown";
  classification_confidence: number;
  rejection_reason: RejectionReason;
  is_strategic_category: boolean;
}

function containsAny(haystack: string, needles: string[]): string | null {
  for (const n of needles) {
    if (haystack.includes(n)) return n;
  }
  return null;
}

export function classifyListing(input: ClassifyInput): ClassifyResult {
  const raw = `${input.title || ""} ${input.description || ""} ${input.category || ""}`;
  const text = raw.toLowerCase();

  // 1) Hard exclusions (order matters — massage first)
  if (containsAny(text, MASSAGE_KEYWORDS)) {
    return {
      intent: "unclear", primary_category: null, secondary_categories: [], services_detected: [],
      language: detectLanguage(raw), classification_confidence: 0.99,
      rejection_reason: "massage_or_body_service", is_strategic_category: false,
    };
  }
  if (containsAny(text, ADULT_KEYWORDS)) {
    return {
      intent: "unclear", primary_category: null, secondary_categories: [], services_detected: [],
      language: detectLanguage(raw), classification_confidence: 0.98,
      rejection_reason: "adult_or_companionship", is_strategic_category: false,
    };
  }
  if (containsAny(text, BEAUTY_KEYWORDS)) {
    return {
      intent: "unclear", primary_category: null, secondary_categories: [], services_detected: [],
      language: detectLanguage(raw), classification_confidence: 0.9,
      rejection_reason: "beauty_or_personal_care", is_strategic_category: false,
    };
  }
  // "spa" allowed only for hot-tub / pool / equipment context
  if (/\bspa\b/.test(text) && !/hot tub|hot-tub|pool|piscine|spa (repair|maintenance|equipment|installation)|equipment|réparation|reparation|entretien/.test(text)) {
    return {
      intent: "unclear", primary_category: null, secondary_categories: [], services_detected: [],
      language: detectLanguage(raw), classification_confidence: 0.75,
      rejection_reason: "beauty_or_personal_care", is_strategic_category: false,
    };
  }
  if (containsAny(text, NON_HOME_KEYWORDS)) {
    return {
      intent: "unclear", primary_category: null, secondary_categories: [], services_detected: [],
      language: detectLanguage(raw), classification_confidence: 0.85,
      rejection_reason: "non_home_service", is_strategic_category: false,
    };
  }
  if (containsAny(text, JOB_SEEKER_PHRASES)) {
    return {
      intent: "employment", primary_category: null, secondary_categories: [], services_detected: [],
      language: detectLanguage(raw), classification_confidence: 0.9,
      rejection_reason: "job_seeker", is_strategic_category: false,
    };
  }

  // 2) Intent (customer vs provider)
  const providerHit = PROVIDER_PHRASES.filter(p => text.includes(p)).length;
  const customerHit = CUSTOMER_REQUEST_PHRASES.filter(p => text.includes(p)).length;

  let intent: ListingIntent;
  if (customerHit > providerHit && customerHit >= 1) intent = "customer_requesting_service";
  else if (providerHit >= 1) intent = "provider_offering_service";
  else intent = "unclear";

  // 3) Category detection
  const primary: { canonical: string; hits: number } | null = null;
  const scored: { canonical: string; hits: number; strategic: boolean }[] = [];
  for (const spec of HOME_SERVICE_CATEGORIES) {
    let hits = 0;
    for (const k of spec.keywords) if (text.includes(k)) hits += 1;
    if (hits > 0) scored.push({ canonical: spec.canonical, hits, strategic: !!spec.strategic });
  }
  scored.sort((a, b) => b.hits - a.hits);
  const primary_category = scored[0]?.canonical ?? null;
  const secondary_categories = scored.slice(1, 4).map(s => s.canonical);
  const is_strategic_category = primary_category ? STRATEGIC_CATEGORIES.has(primary_category) : false;

  // 4) If no category detected and no provider phrases, likely non-home
  if (!primary_category && intent !== "provider_offering_service") {
    return {
      intent, primary_category: null, secondary_categories: [], services_detected: [],
      language: detectLanguage(raw), classification_confidence: 0.4,
      rejection_reason: "non_home_service", is_strategic_category: false,
    };
  }

  // 5) Customer request wins → reject
  if (intent === "customer_requesting_service") {
    return {
      intent, primary_category, secondary_categories, services_detected: [],
      language: detectLanguage(raw), classification_confidence: 0.85,
      rejection_reason: "customer_request", is_strategic_category,
    };
  }

  // 6) Confidence
  let confidence = 0.5;
  if (primary_category) confidence += 0.2;
  if (scored[0]?.hits && scored[0].hits >= 2) confidence += 0.1;
  if (providerHit >= 1) confidence += 0.1;
  if (providerHit >= 3) confidence += 0.05;
  confidence = Math.min(0.98, confidence);

  return {
    intent,
    primary_category,
    secondary_categories,
    services_detected: scored.map(s => s.canonical),
    language: detectLanguage(raw),
    classification_confidence: Number(confidence.toFixed(2)),
    rejection_reason: null,
    is_strategic_category,
  };
}

// ---- Acquisition scoring ----------------------------------------------------

export interface ScoreInput {
  primary_category: string | null;
  is_strategic_category: boolean;
  city: string | null;
  province: string | null;
  phone_type: "mobile" | "landline" | "voip" | "unknown" | null;
  phone_sms_capable: boolean | null;
  email: string | null;
  website: string | null;
  business_name: string | null;
  description: string | null;
  years_experience: number | null;
  rbq_number: string | null;
  insured_claimed: boolean | null;
  free_estimate_claimed: boolean | null;
  emergency_service_claimed: boolean | null;
  image_count: number | null;
  rating: number | null;
  review_count: number | null;
  posted_at: string | null;
  is_duplicate: boolean;
  shortage_market: boolean;
}

const PRIORITY_CITIES = new Set([
  "Laval","Montreal","Montréal","Terrebonne","Mascouche","Repentigny",
  "Longueuil","Brossard","Saint-Jerome","Saint-Jérôme","Mirabel",
  "Blainville","Boisbriand","Sainte-Therese","Sainte-Thérèse",
]);
const GREATER_MONTREAL = new Set([
  "Vaudreuil-Dorion","West Island","Laurentides","Lanaudiere","Lanaudière","Monteregie","Montérégie",
]);

export function scoreAcquisition(p: ScoreInput): { score: number; breakdown: Record<string, number> } {
  const b: Record<string, number> = {};

  // Contactability — 25
  if (p.phone_type === "mobile" && p.phone_sms_capable) b.contactability = 25;
  else if (p.phone_type === "voip" && p.phone_sms_capable) b.contactability = 18;
  else if (p.phone_type === "landline" && p.email) b.contactability = 12;
  else if (p.email) b.contactability = 8;
  else if (p.phone_type === "landline") b.contactability = 5;
  else b.contactability = 0;

  // Service fit — 20
  if (p.is_strategic_category) b.service_fit = 20;
  else if (p.primary_category) b.service_fit = 15;
  else b.service_fit = 0;

  // Geography — 15
  if (p.shortage_market) b.geography = 15;
  else if (p.city && PRIORITY_CITIES.has(p.city)) b.geography = 12;
  else if (p.city && GREATER_MONTREAL.has(p.city)) b.geography = 10;
  else if (p.province === "QC") b.geography = 5;
  else b.geography = 0;

  // Business quality — 15
  let q = 0;
  if (p.business_name) q += 3;
  if (p.description && p.description.length > 120) q += 2;
  if (p.years_experience && p.years_experience >= 3) q += 2;
  if (p.rbq_number) q += 3;
  if (p.insured_claimed) q += 2;
  if (p.image_count && p.image_count >= 2) q += 1;
  if (p.rating && p.review_count && p.review_count >= 3) q += 2;
  b.business_quality = Math.min(15, q);

  // Commercial intent — 15
  let ci = 0;
  if (p.posted_at) {
    const days = (Date.now() - new Date(p.posted_at).getTime()) / 86400000;
    if (days <= 7) ci += 6;
    else if (days <= 30) ci += 4;
  }
  const desc = (p.description || "").toLowerCase();
  if (/call or text|appelez ou textez/.test(desc)) ci += 3;
  if (p.free_estimate_claimed) ci += 2;
  if (/booking|available now|disponible/.test(desc)) ci += 2;
  if (p.emergency_service_claimed) ci += 2;
  b.commercial_intent = Math.min(15, ci);

  // Opportunity — 10
  let opp = 0;
  if (!p.website) opp += 5;
  if (!p.website && !p.email) opp += 3;
  if (p.business_name && !/inc\.|ltée|ltee|ltd|corp/i.test(p.business_name)) opp += 2;
  if (p.posted_at) opp += 2;
  b.opportunity = Math.min(10, opp);

  // Risk penalty
  let penalty = 0;
  if (p.is_duplicate) penalty += 50;
  if (/best price guaranteed|lowest price ever|100% satisfaction|!!!/.test(desc)) penalty += 10;
  b.risk_penalty = -penalty;

  const score = Math.max(0, Math.min(100,
    b.contactability + b.service_fit + b.geography + b.business_quality +
    b.commercial_intent + b.opportunity + b.risk_penalty,
  ));
  return { score, breakdown: b };
}

// ---- Priority bucket --------------------------------------------------------

export type PriorityBucket = "P0" | "P1" | "P2" | "P3" | "REVIEW" | "REJECT";

export function priorityBucket(args: {
  score: number;
  classification_confidence: number;
  phone_type: string | null;
  phone_sms_capable: boolean | null;
  email: string | null;
  rejection_reason: RejectionReason;
}): PriorityBucket {
  if (args.rejection_reason) return "REJECT";
  if (args.score < 50) return "REJECT";
  if (args.classification_confidence < 0.8) return "REVIEW";
  const hasMobile = args.phone_type === "mobile" && !!args.phone_sms_capable;
  if (args.score >= 80 && hasMobile) return "P0";
  if (args.score >= 65 && hasMobile) return "P1";
  if (args.score >= 65 && args.email) return "P2";
  return "P3";
}

// ---- Phone / email / contact extraction (visible only) ----------------------

const PHONE_REGEX = /(?:\+?1[\s.-]?)?\(?([2-9]\d{2})\)?[\s.-]?([2-9]\d{2})[\s.-]?(\d{4})/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_REGEX = /\bhttps?:\/\/[^\s<>"']+/gi;
const RBQ_REGEX = /\bRBQ[:\s#-]*(\d{4}[-\s]?\d{4}[-\s]?\d{2})/i;

export function extractPhone(text: string): string | null {
  const m = PHONE_REGEX.exec(text);
  if (!m) return null;
  return `${m[1]}${m[2]}${m[3]}`;
}
export function extractAllPhones(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(PHONE_REGEX.source, "g");
  while ((m = re.exec(text))) out.push(`${m[1]}${m[2]}${m[3]}`);
  return Array.from(new Set(out));
}
export function extractEmail(text: string): string | null {
  const m = text.match(EMAIL_REGEX);
  return m ? m[0].toLowerCase() : null;
}
export function extractWebsite(text: string): string | null {
  const m = text.match(URL_REGEX);
  if (!m) return null;
  const u = m.find(x => !/kijiji\.ca|facebook\.com|instagram\.com/i.test(x));
  return u ?? null;
}
export function extractRbq(text: string): string | null {
  const m = text.match(RBQ_REGEX);
  return m ? m[1].replace(/[\s-]/g, "") : null;
}

// ---- Business-name normalization (for fuzzy dedupe) ------------------------

export function normalizeBusinessName(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/\b(inc|ltée|ltee|ltd|corp|corporation|les|le|la|services?|construction|rénovation|renovation)\b\.?/gi, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---- NANP phone-type heuristic (mobile vs landline) ------------------------
// Coarse: known Quebec area codes and cell/landline mix. Real determination
// requires carrier lookup in validate-kijiji-contact via Twilio Lookup.
const QC_AREA_CODES = new Set(["418","438","450","514","579","581","819","873"]);

export function coarsePhoneType(e164: string | null): "mobile" | "landline" | "unknown" {
  if (!e164) return "unknown";
  const m = e164.match(/^\+1(\d{3})/);
  if (!m) return "unknown";
  // Cannot reliably distinguish without lookup; return unknown by default.
  return QC_AREA_CODES.has(m[1]) ? "unknown" : "unknown";
}

/**
 * UNPRO — Business Import Service
 * Mock service for retrieving business data from external sources.
 * Architecture ready for real API integration (Google Places, Meta, web crawler).
 */

export type DataState = "imported" | "inferred" | "needs_confirmation" | "missing";

export interface RetrievalModule {
  id: string;
  label: string;
  status: "waiting" | "scanning" | "found" | "partial" | "missing" | "completed";
  progress: number;
  messages: string[];
}

export interface BusinessDataField {
  value: string | number | boolean | string[] | null;
  state: DataState;
  source: string;
  confidence: number;
}

export interface ImportedBusinessData {
  businessName: BusinessDataField;
  category: BusinessDataField;
  phone: BusinessDataField;
  email: BusinessDataField;
  website: BusinessDataField;
  address: BusinessDataField;
  city: BusinessDataField;
  province: BusinessDataField;
  postalCode: BusinessDataField;
  logoUrl: BusinessDataField;
  description: BusinessDataField;
  rating: BusinessDataField;
  reviewCount: BusinessDataField;
  reviewRecency: BusinessDataField;
  ownerResponses: BusinessDataField;
  photoCount: BusinessDataField;
  businessHours: BusinessDataField;
  serviceArea: BusinessDataField;
  websiteCta: BusinessDataField;
  websiteSchema: BusinessDataField;
  websiteFaq: BusinessDataField;
  facebookPresence: BusinessDataField;
  facebookFollowers: BusinessDataField;
  insuranceInfo: BusinessDataField;
  licenseNumber: BusinessDataField;
  certifications: BusinessDataField;
  portfolioPhotos: BusinessDataField;
  yearsExperience: BusinessDataField;
  languages: BusinessDataField;
  emergencyService: BusinessDataField;
  warranties: BusinessDataField;
  financing: BusinessDataField;
}

export interface AuditSection {
  id: string;
  label: string;
  status: "strong" | "needs_attention" | "weak" | "missing";
  items: { label: string; status: "strong" | "needs_attention" | "weak" | "missing"; detail: string }[];
}

export function createEmptyBusinessData(): ImportedBusinessData {
  const missing = (source = "none"): BusinessDataField => ({ value: null, state: "missing", source, confidence: 0 });
  return {
    businessName: missing(), category: missing(), phone: missing(), email: missing(),
    website: missing(), address: missing(), city: missing(), province: missing(),
    postalCode: missing(), logoUrl: missing(), description: missing(), rating: missing(),
    reviewCount: missing(), reviewRecency: missing(), ownerResponses: missing(),
    photoCount: missing(), businessHours: missing(), serviceArea: missing(),
    websiteCta: missing(), websiteSchema: missing(), websiteFaq: missing(),
    facebookPresence: missing(), facebookFollowers: missing(), insuranceInfo: missing(),
    licenseNumber: missing(), certifications: missing(), portfolioPhotos: missing(),
    yearsExperience: missing(), languages: missing(), emergencyService: missing(),
    warranties: missing(), financing: missing(),
  };
}

/** Simulate a progressive retrieval with realistic delays */
export function simulateRetrieval(
  businessName: string,
  onModuleUpdate: (modules: RetrievalModule[]) => void,
  onComplete: (data: ImportedBusinessData) => void
): () => void {
  let cancelled = false;

  const modules: RetrievalModule[] = [
    { id: "identity", label: "Identifying business", status: "waiting", progress: 0, messages: [] },
    { id: "google", label: "Retrieving Google profile", status: "waiting", progress: 0, messages: [] },
    { id: "facebook", label: "Retrieving Facebook profile", status: "waiting", progress: 0, messages: [] },
    { id: "website", label: "Scanning website", status: "waiting", progress: 0, messages: [] },
    { id: "matching", label: "Matching identity signals", status: "waiting", progress: 0, messages: [] },
    { id: "analysis", label: "Analyzing ratings, photos & trust", status: "waiting", progress: 0, messages: [] },
    { id: "aipp", label: "Calculating AIPP", status: "waiting", progress: 0, messages: [] },
    { id: "plan", label: "Generating improvement plan", status: "waiting", progress: 0, messages: [] },
  ];

  const update = (idx: number, patch: Partial<RetrievalModule>) => {
    if (cancelled) return;
    Object.assign(modules[idx], patch);
    onModuleUpdate([...modules]);
  };

  const steps: Array<{ idx: number; delay: number; patch: Partial<RetrievalModule> }> = [
    { idx: 0, delay: 400, patch: { status: "scanning", progress: 30, messages: ["Matching business identity…"] } },
    { idx: 0, delay: 900, patch: { status: "completed", progress: 100, messages: ["Matching business identity…", `"${businessName}" identified`] } },
    { idx: 1, delay: 1400, patch: { status: "scanning", progress: 20, messages: ["Searching Google Maps…"] } },
    { idx: 1, delay: 2200, patch: { status: "scanning", progress: 60, messages: ["Searching Google Maps…", "Google profile found"] } },
    { idx: 1, delay: 3000, patch: { status: "completed", progress: 100, messages: ["Searching Google Maps…", "Google profile found", "47 reviews indexed", "86 photos detected"] } },
    { idx: 2, delay: 2000, patch: { status: "scanning", progress: 30, messages: ["Searching Facebook pages…"] } },
    { idx: 2, delay: 3200, patch: { status: "partial", progress: 100, messages: ["Searching Facebook pages…", "Facebook page partially matched", "234 followers found"] } },
    { idx: 3, delay: 2800, patch: { status: "scanning", progress: 40, messages: ["Crawling website…"] } },
    { idx: 3, delay: 4000, patch: { status: "completed", progress: 100, messages: ["Crawling website…", "Website logo matched", "Business hours found", "Service area incomplete"] } },
    { idx: 4, delay: 4200, patch: { status: "scanning", progress: 50, messages: ["Cross-referencing sources…"] } },
    { idx: 4, delay: 5000, patch: { status: "completed", progress: 100, messages: ["Cross-referencing sources…", "Identity signals matched", "Phone consistency verified"] } },
    { idx: 5, delay: 5200, patch: { status: "scanning", progress: 40, messages: ["Analyzing trust signals…"] } },
    { idx: 5, delay: 6200, patch: { status: "completed", progress: 100, messages: ["Analyzing trust signals…", "Rating: 4.6/5", "Review response rate below target", "Insurance status unknown"] } },
    { idx: 6, delay: 6400, patch: { status: "scanning", progress: 60, messages: ["Calculating visibility score…"] } },
    { idx: 6, delay: 7200, patch: { status: "completed", progress: 100, messages: ["Calculating visibility score…", "AIPP score calculated: 58/100"] } },
    { idx: 7, delay: 7400, patch: { status: "scanning", progress: 50, messages: ["Generating best-fit plan…"] } },
    { idx: 7, delay: 8200, patch: { status: "completed", progress: 100, messages: ["Generating best-fit plan…", "Growth plan recommended"] } },
  ];

  const timers: ReturnType<typeof setTimeout>[] = [];
  steps.forEach(({ idx, delay, patch }) => {
    timers.push(setTimeout(() => update(idx, patch), delay));
  });

  timers.push(setTimeout(() => {
    if (cancelled) return;
    onComplete(generateMockData(businessName));
  }, 8600));

  return () => { cancelled = true; timers.forEach(clearTimeout); };
}

function generateMockData(name: string): ImportedBusinessData {
  const imp = (v: any, src: string, conf = 0.95): BusinessDataField => ({ value: v, state: "imported", source: src, confidence: conf });
  const inf = (v: any, src: string, conf = 0.7): BusinessDataField => ({ value: v, state: "inferred", source: src, confidence: conf });
  const conf = (v: any, src: string): BusinessDataField => ({ value: v, state: "needs_confirmation", source: src, confidence: 0.5 });
  const miss = (src = "none"): BusinessDataField => ({ value: null, state: "missing", source: src, confidence: 0 });

  return {
    businessName: imp(name, "google"),
    category: imp("Plomberie", "google"),
    phone: imp("(514) 555-1234", "google", 0.98),
    email: inf("info@" + name.toLowerCase().replace(/\s/g, "") + ".ca", "website"),
    website: imp("https://www." + name.toLowerCase().replace(/\s/g, "") + ".ca", "google"),
    address: imp("1234 Rue Saint-Denis", "google"),
    city: imp("Montréal", "google"),
    province: imp("Québec", "google"),
    postalCode: conf("H2X 3K2", "google"),
    logoUrl: imp("/placeholder.svg", "website"),
    description: inf("Services de plomberie résidentielle et commerciale dans la grande région de Montréal.", "website", 0.65),
    rating: imp(4.6, "google"),
    reviewCount: imp(47, "google"),
    reviewRecency: imp("2 weeks ago", "google"),
    ownerResponses: conf("32%", "google"),
    photoCount: imp(86, "google"),
    businessHours: imp("Lun-Ven 8h-17h", "google"),
    serviceArea: inf(["Montréal", "Laval", "Longueuil"], "google", 0.6),
    websiteCta: conf("weak", "website"),
    websiteSchema: miss("website"),
    websiteFaq: miss("website"),
    facebookPresence: imp(true, "facebook"),
    facebookFollowers: imp(234, "facebook"),
    insuranceInfo: miss(),
    licenseNumber: miss(),
    certifications: miss(),
    portfolioPhotos: conf(["photo1.jpg", "photo2.jpg"], "google"),
    yearsExperience: miss(),
    languages: inf(["Français"], "website"),
    emergencyService: miss(),
    warranties: miss(),
    financing: miss(),
  };
}

export function generateAuditSections(data: ImportedBusinessData): AuditSection[] {
  const s = (f: BusinessDataField): "strong" | "needs_attention" | "weak" | "missing" => {
    if (f.state === "missing") return "missing";
    if (f.state === "needs_confirmation") return "needs_attention";
    if (f.confidence >= 0.8) return "strong";
    return "needs_attention";
  };

  return [
    { id: "identity", label: "Business Identity", status: s(data.businessName), items: [
      { label: "Business name consistency", status: s(data.businessName), detail: data.businessName.value ? "Consistent across sources" : "Not found" },
      { label: "Logo consistency", status: s(data.logoUrl), detail: data.logoUrl.state === "imported" ? "Logo found and matched" : "Logo needs verification" },
      { label: "Category clarity", status: s(data.category), detail: data.category.value ? `${data.category.value}` : "Missing" },
    ]},
    { id: "ratings", label: "Ratings & Reviews", status: s(data.rating), items: [
      { label: "Rating quality", status: (data.rating.value as number) >= 4.5 ? "strong" : "needs_attention", detail: `${data.rating.value}/5` },
      { label: "Review count", status: (data.reviewCount.value as number) >= 30 ? "strong" : "needs_attention", detail: `${data.reviewCount.value} reviews` },
      { label: "Owner responses", status: s(data.ownerResponses), detail: `${data.ownerResponses.value || "Unknown"} response rate` },
    ]},
    { id: "photos", label: "Photos & Logo", status: s(data.photoCount), items: [
      { label: "Photo count", status: (data.photoCount.value as number) >= 50 ? "strong" : "needs_attention", detail: `${data.photoCount.value} photos` },
      { label: "Before/after portfolio", status: s(data.portfolioPhotos), detail: data.portfolioPhotos.state === "missing" ? "Not found" : "Partially found" },
    ]},
    { id: "website", label: "Website Quality", status: s(data.websiteCta), items: [
      { label: "CTA clarity", status: data.websiteCta.value === "weak" ? "weak" : "strong", detail: data.websiteCta.value === "weak" ? "Weak call-to-action" : "Clear CTA" },
      { label: "Structured schema", status: s(data.websiteSchema), detail: data.websiteSchema.state === "missing" ? "Not found" : "Present" },
      { label: "FAQ content", status: s(data.websiteFaq), detail: data.websiteFaq.state === "missing" ? "Missing" : "Present" },
    ]},
    { id: "social", label: "Social Presence", status: s(data.facebookPresence), items: [
      { label: "Facebook page", status: data.facebookPresence.value ? "strong" : "missing", detail: data.facebookPresence.value ? `${data.facebookFollowers.value} followers` : "Not found" },
    ]},
    { id: "trust", label: "Trust & Proof", status: "weak", items: [
      { label: "Insurance", status: s(data.insuranceInfo), detail: data.insuranceInfo.state === "missing" ? "Not found" : "Verified" },
      { label: "License / RBQ", status: s(data.licenseNumber), detail: data.licenseNumber.state === "missing" ? "Not found" : "Present" },
      { label: "Certifications", status: s(data.certifications), detail: data.certifications.state === "missing" ? "Not found" : "Present" },
    ]},
    { id: "visibility", label: "Local Visibility", status: "needs_attention", items: [
      { label: "Service area coverage", status: s(data.serviceArea), detail: data.serviceArea.state === "missing" ? "Missing" : "Partial" },
      { label: "City-service pages", status: "missing", detail: "No dedicated pages" },
    ]},
    { id: "aiseo", label: "AI / SEO Readiness", status: "missing", items: [
      { label: "Schema markup", status: s(data.websiteSchema), detail: data.websiteSchema.state === "missing" ? "Not found" : "Present" },
      { label: "FAQ structured data", status: s(data.websiteFaq), detail: data.websiteFaq.state === "missing" ? "Not found" : "Present" },
      { label: "Content depth", status: "weak", detail: "Limited content detected" },
    ]},
  ];
}

export interface OnboardingAIPPScore {
  total: number;
  tier: "Bronze" | "Silver" | "Gold" | "Elite" | "Authority";
  percentile: number;
  pillars: {
    identity: { score: number; max: 20; explanation: string; quickWins: string[] };
    trust: { score: number; max: 20; explanation: string; quickWins: string[] };
    visibility: { score: number; max: 20; explanation: string; quickWins: string[] };
    conversion: { score: number; max: 20; explanation: string; quickWins: string[] };
    aiSeo: { score: number; max: 20; explanation: string; quickWins: string[] };
  };
  topOpportunities: string[];
}

export function calculateOnboardingAIPP(data: ImportedBusinessData): OnboardingAIPPScore {
  const countState = (fields: BusinessDataField[], target: DataState) => fields.filter(f => f.state === target).length;
  const allFields = Object.values(data);
  const imported = countState(allFields, "imported");
  const total = allFields.length;
  const completeness = imported / total;

  const identityScore = Math.round(16 * completeness + (data.logoUrl.state !== "missing" ? 2 : 0) + (data.category.state !== "missing" ? 2 : 0));
  const trustScore = Math.min(20, Math.round(
    (data.rating.value && (data.rating.value as number) >= 4 ? 6 : 2) +
    (data.reviewCount.value && (data.reviewCount.value as number) >= 20 ? 5 : 2) +
    (data.insuranceInfo.state !== "missing" ? 4 : 0) +
    (data.licenseNumber.state !== "missing" ? 5 : 0)
  ));
  const visibilityScore = Math.min(20, Math.round(
    (data.facebookPresence.value ? 4 : 0) +
    (data.website.state !== "missing" ? 4 : 0) +
    (data.serviceArea.state !== "missing" ? 4 : 0) +
    (data.photoCount.value && (data.photoCount.value as number) >= 30 ? 4 : 2) +
    2
  ));
  const conversionScore = Math.min(20, Math.round(
    (data.websiteCta.value !== "weak" && data.websiteCta.state !== "missing" ? 6 : 2) +
    (data.phone.state !== "missing" ? 4 : 0) +
    (data.businessHours.state !== "missing" ? 3 : 0) +
    3
  ));
  const aiSeoScore = Math.min(20, Math.round(
    (data.websiteSchema.state !== "missing" ? 6 : 0) +
    (data.websiteFaq.state !== "missing" ? 5 : 0) +
    (data.description.state !== "missing" ? 3 : 1) +
    2
  ));

  const score = Math.min(100, identityScore + trustScore + visibilityScore + conversionScore + aiSeoScore);
  const tier = score >= 85 ? "Authority" : score >= 70 ? "Elite" : score >= 55 ? "Gold" : score >= 40 ? "Silver" : "Bronze";

  return {
    total: score,
    tier,
    percentile: Math.min(95, Math.round(score * 0.9 + 10)),
    pillars: {
      identity: { score: identityScore, max: 20, explanation: "Your business is mostly consistent online, but some brand and service-area signals are incomplete.", quickWins: ["Upload consistent logo", "Verify business category"] },
      trust: { score: trustScore, max: 20, explanation: "Trust signals are partially present. Missing insurance and license data significantly impact your credibility.", quickWins: ["Add RBQ license", "Upload insurance certificate", "Respond to more reviews"] },
      visibility: { score: visibilityScore, max: 20, explanation: "Decent web presence, but missing city-service pages and structured local content.", quickWins: ["Add city-service pages", "Complete Facebook profile", "Upload more project photos"] },
      conversion: { score: conversionScore, max: 20, explanation: "Website conversion potential is limited. CTA and contact visibility need improvement.", quickWins: ["Improve homepage CTA", "Add trust badges to website", "Add quote request form"] },
      aiSeo: { score: aiSeoScore, max: 20, explanation: "Minimal AI/SEO readiness. No structured data or FAQ content detected.", quickWins: ["Add schema markup", "Create FAQ section", "Build semantic service content"] },
    },
    topOpportunities: [
      "Respond to more reviews",
      "Add city-service pages",
      "Improve homepage CTA",
      "Add trust badges",
      "Upload before/after work",
      "Complete certifications",
      "Add structured data",
    ],
  };
}

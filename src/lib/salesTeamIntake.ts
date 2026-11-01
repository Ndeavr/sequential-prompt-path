/** Qualification équipe de vente (/directeur-des-ventes) : validation, simulation transparente, liens. */
export type SalesRole = "seller" | "sales_director" | "owner";
export type SalesObjective = "more_sales" | "profitability" | "bigger_ticket" | "less_travel" | "fill_calendars";

export interface SalesTeamForm {
  company: string; website: string; role: SalesRole | "";
  sellers_count: string; specialties: string; priority_mandates: string; refused_mandates: string;
  territories: string; travel_radius_km: string;
  objectives: SalesObjective[]; annual_revenue_goal_cad: string;
  weekly_capacity: string; average_ticket_cad: string; close_rate_pct: string;
  ticket_unknown: boolean; rate_unknown: boolean;
  first_name: string; last_name: string; email: string; phone: string;
  follow_up_consent: boolean; marketing_opt_in: boolean;
}

export const EMPTY_SALES_FORM: SalesTeamForm = {
  company: "", website: "", role: "", sellers_count: "", specialties: "", priority_mandates: "", refused_mandates: "",
  territories: "", travel_radius_km: "", objectives: [], annual_revenue_goal_cad: "",
  weekly_capacity: "", average_ticket_cad: "", close_rate_pct: "", ticket_unknown: false, rate_unknown: false,
  first_name: "", last_name: "", email: "", phone: "", follow_up_consent: false, marketing_opt_in: false,
};

/** Accepte « 12 500 », « 12 500,50 », « 12500.5 ». Retourne null si vide ou invalide. */
export function parseAmount(raw: string): number | null {
  const v = raw.replace(/[\s\u00a0\u202f$]/g, "").replace(",", ".");
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
const int = (raw: string) => { const n = parseAmount(raw); return n !== null && Number.isInteger(n) ? n : null; };

export const SALES_STEPS = 5;

export function validateSalesStep(step: number, f: SalesTeamForm, fr = true): Record<string, string> {
  const e: Record<string, string> = {};
  const t = (a: string, b: string) => (fr ? a : b);
  if (step === 0) {
    if (f.company.trim().length < 2) e.company = t("Indiquez le nom de l’entreprise.", "Enter the company name.");
    if (!f.role) e.role = t("Choisissez votre rôle.", "Choose your role.");
    const n = int(f.sellers_count);
    if (n === null || n < 1 || n > 500) e.sellers_count = t("Entrez un nombre entier de vendeurs entre 1 et 500.", "Enter a whole number of sellers between 1 and 500.");
  }
  if (step === 1) {
    if (f.specialties.trim().length < 2) e.specialties = t("Indiquez au moins une spécialité.", "Enter at least one specialty.");
    if (f.territories.trim().length < 2) e.territories = t("Indiquez au moins un territoire.", "Enter at least one territory.");
    if (f.travel_radius_km) { const r = int(f.travel_radius_km); if (r === null || r < 1 || r > 1000) e.travel_radius_km = t("Rayon entre 1 et 1000 km.", "Radius between 1 and 1000 km."); }
  }
  if (step === 2) {
    if (!f.objectives.length) e.objectives = t("Choisissez au moins un objectif.", "Choose at least one goal.");
    if (f.annual_revenue_goal_cad) { const g = parseAmount(f.annual_revenue_goal_cad); if (g === null || g <= 0 || g > 100_000_000) e.annual_revenue_goal_cad = t("Montant entre 1 $ et 100 000 000 $.", "Amount between $1 and $100,000,000."); }
  }
  if (step === 3) {
    if (f.weekly_capacity) { const c = int(f.weekly_capacity); if (c === null || c < 1 || c > 2000) e.weekly_capacity = t("Nombre entier entre 1 et 2000.", "Whole number between 1 and 2000."); }
    if (!f.ticket_unknown && f.average_ticket_cad) { const v = parseAmount(f.average_ticket_cad); if (v === null || v < 1 || v > 10_000_000) e.average_ticket_cad = t("Montant entre 1 $ et 10 000 000 $.", "Amount between $1 and $10,000,000."); }
    if (!f.rate_unknown && f.close_rate_pct) { const v = parseAmount(f.close_rate_pct); if (v === null || v <= 0 || v > 100) e.close_rate_pct = t("Taux entre 0,1 % et 100 %.", "Rate between 0.1% and 100%."); }
  }
  if (step === 4) {
    if (!f.first_name.trim()) e.first_name = t("Prénom requis.", "First name required.");
    if (!f.last_name.trim()) e.last_name = t("Nom requis.", "Last name required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = t("Courriel invalide.", "Invalid email.");
    if (!f.follow_up_consent) e.follow_up_consent = t("Ce consentement est requis pour traiter la demande.", "This consent is required to process the request.");
  }
  return e;
}

export interface SalesSimulation { additionalSales: number; appointments: number | null; annual: true }

/** Simulation annuelle fondée sur les déclarations. null si données insuffisantes (jamais de division par zéro). */
export function simulateSales(goal: number | null, ticket: number | null, ratePct: number | null): SalesSimulation | null {
  if (!goal || goal <= 0 || !ticket || ticket <= 0) return null;
  const additionalSales = Math.ceil(goal / ticket);
  const appointments = ratePct && ratePct > 0 && ratePct <= 100 ? Math.ceil(additionalSales / (ratePct / 100)) : null;
  return { additionalSales, appointments, annual: true };
}

export const fmtCad = (n: number, fr = true) =>
  new Intl.NumberFormat(fr ? "fr-CA" : "en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
export const fmtInt = (n: number, fr = true) => new Intl.NumberFormat(fr ? "fr-CA" : "en-CA").format(n);

export function toPayload(f: SalesTeamForm) {
  return {
    company: f.company.trim(), website: f.website.trim() || null, role: f.role,
    sellers_count: int(f.sellers_count), specialties: f.specialties.trim(),
    priority_mandates: f.priority_mandates.trim() || null, refused_mandates: f.refused_mandates.trim() || null,
    territories: f.territories.trim(), travel_radius_km: f.travel_radius_km ? int(f.travel_radius_km) : null,
    objectives: f.objectives, annual_revenue_goal_cad: parseAmount(f.annual_revenue_goal_cad),
    weekly_capacity: f.weekly_capacity ? int(f.weekly_capacity) : null,
    average_ticket_cad: f.ticket_unknown ? null : parseAmount(f.average_ticket_cad),
    close_rate_pct: f.rate_unknown ? null : parseAmount(f.close_rate_pct),
    first_name: f.first_name.trim(), last_name: f.last_name.trim(), email: f.email.trim(), phone: f.phone.trim() || null,
    follow_up_consent: f.follow_up_consent, marketing_opt_in: f.marketing_opt_in,
  };
}

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"];
export function pickUtm(search: string): Record<string, string> {
  const p = new URLSearchParams(search); const out: Record<string, string> = {};
  for (const k of UTM_KEYS) { const v = p.get(k); if (v && /^[\w.\-+ %]{1,120}$/.test(v)) out[k] = v; }
  return out;
}

/** Lien partagé propre : seulement la campagne, aucune donnée personnelle ni saisie. */
export function buildShareUrl(origin: string, utm: Record<string, string>): string {
  const u = new URL("/directeur-des-ventes", origin);
  if (utm.utm_campaign) u.searchParams.set("utm_campaign", utm.utm_campaign);
  u.searchParams.set("utm_source", "share");
  return u.toString();
}

/** Contexte transmis à Clara (parcours entrepreneur) sans coordonnées. */
export function buildSalesClaraLink(f: SalesTeamForm): string {
  const n = int(f.sellers_count) ?? 1;
  const parts = [`Je suis entrepreneur. Équipe de ${n} vendeur${n > 1 ? "s" : ""}`];
  if (f.specialties.trim()) parts.push(`spécialités : ${f.specialties.trim().slice(0, 120)}`);
  if (f.territories.trim()) parts.push(`territoires : ${f.territories.trim().slice(0, 120)}`);
  parts.push("je veux une offre de rendez-vous adaptée à mon équipe");
  return `/alex?q=${encodeURIComponent(parts.join(", ") + ".")}`;
}

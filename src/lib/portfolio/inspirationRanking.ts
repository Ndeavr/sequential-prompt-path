/**
 * Ordre « Pour vous » du fil de réalisations existant (accueil, sous Clara).
 *
 * Réordonne côté client UN lot déjà servi par le serveur (projets approuvés
 * seulement) avec un score déterministe et explicable. Signaux utilisés :
 * ville du visiteur (seulement si déclarée dans son Passeport Maison), saison
 * au Québec, « J'aime » de la visite, travaux déclarés terminés dans le
 * Passeport, fraîcheur, diversité des entreprises. Jamais le forfait payé,
 * jamais d'IA, jamais une catégorie exclue quand le statut est inconnu.
 */
import { suggestService } from "./portfolioFlow";

export type SortMode = "for_you" | "recent" | "other";
export type Season = "winter" | "spring" | "summer" | "autumn";

export interface RankableProject {
  id: string; title: string; service_name: string | null; city: string | null;
  description?: string | null; published_at: string; company_name?: string | null; author_key?: string | null;
}

export interface RankingContext {
  now: Date;
  visitorCity?: string | null;
  /** Catégories (libellés FR) déclarées terminées — jamais devinées. */
  completedCategories?: string[];
  /** Catégories des projets aimés pendant la visite. */
  likedCategories?: string[];
}

/** Catégorie stable (libellé FR) d'après le type de travaux puis le titre. */
export function categoryOf(p: Pick<RankableProject, "service_name" | "title">): string | null {
  return suggestService(p.service_name ?? "", "fr") ?? suggestService(p.title ?? "", "fr") ?? null;
}

/** Saisons météo usuelles au Québec, par mois civil (heure de Montréal). */
export function quebecSeason(d: Date): Season {
  const m = Number(new Intl.DateTimeFormat("en-CA", { month: "numeric", timeZone: "America/Toronto" }).format(d));
  if (m === 12 || m <= 2) return "winter";
  if (m <= 5) return "spring";
  if (m <= 8) return "summer";
  return "autumn";
}

export const SEASON_CATEGORIES: Record<Season, string[]> = {
  autumn: ["Gouttières", "Toiture", "Portes et fenêtres", "Isolation", "Thermopompe et climatisation", "Drain français"],
  winter: ["Déneigement", "Isolation", "Thermopompe et climatisation", "Rénovation de cuisine", "Salle de bain", "Sous-sol", "Revêtement de sol", "Électricité", "Plomberie"],
  spring: ["Fondation", "Drain français", "Aménagement paysager", "Toiture", "Gouttières", "Maçonnerie", "Clôture"],
  summer: ["Pavé uni", "Asphaltage", "Terrasse et patio", "Peinture", "Aménagement paysager", "Clôture", "Maçonnerie"],
};

export const SEASON_LABEL: Record<Season, { fr: string; en: string }> = {
  winter: { fr: "hiver", en: "winter" }, spring: { fr: "printemps", en: "spring" },
  summer: { fr: "été", en: "summer" }, autumn: { fr: "automne", en: "autumn" },
};

/** Types du Passeport Maison qui décrivent des travaux réalisés (pas un problème ni une inspection). */
const WORK_EVENT_TYPES: Record<string, string | null> = {
  renovation: null, maintenance: null, roof_renovation: "Toiture", electrical_upgrade: "Électricité", plumbing_upgrade: "Plomberie",
};

export interface PassportEvent { event_type: string; title?: string | null; description?: string | null; event_date?: string | null }

/**
 * Travaux déclarés TERMINÉS : type « travaux » et date passée ou du jour.
 * Inspection, urgence, problème d'humidité, achat ou date future → ignorés.
 */
export function completedCategoriesFrom(events: PassportEvent[], now: Date): string[] {
  const today = now.toISOString().slice(0, 10);
  const out = new Set<string>();
  for (const e of events) {
    if (!(e.event_type in WORK_EVENT_TYPES)) continue;
    if (!e.event_date || e.event_date.slice(0, 10) > today) continue;
    const cat = suggestService(`${e.title ?? ""} ${e.description ?? ""}`, "fr") ?? WORK_EVENT_TYPES[e.event_type];
    if (cat) out.add(cat);
  }
  return [...out];
}

const norm = (s?: string | null) => (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export interface ScoreParts { local: number; season: number; interest: number; completed: number; fresh: number }

export function scoreProject(p: RankableProject, ctx: RankingContext): { total: number; parts: ScoreParts } {
  const cat = categoryOf(p);
  const season = SEASON_CATEGORIES[quebecSeason(ctx.now)];
  const ageDays = Math.max(0, (ctx.now.getTime() - new Date(p.published_at).getTime()) / 86_400_000);
  const parts: ScoreParts = {
    local: ctx.visitorCity && p.city && norm(ctx.visitorCity) === norm(p.city) ? 3 : 0,
    season: cat && season.includes(cat) ? 2 : 0,
    interest: cat && ctx.likedCategories?.includes(cat) ? 1.5 : 0,
    completed: cat && ctx.completedCategories?.includes(cat) ? -4 : 0,
    fresh: Math.max(0, 1 - ageDays / 365),
  };
  return { total: parts.local + parts.season + parts.interest + parts.completed + parts.fresh, parts };
}

const byRecent = (a: RankableProject, b: RankableProject) =>
  b.published_at.localeCompare(a.published_at) || b.id.localeCompare(a.id);

const authorOf = (p: RankableProject) => p.author_key ?? (p.company_name ? `name:${norm(p.company_name)}` : null);

/**
 * - recent : ordre serveur (published_at DESC, id DESC), inchangé.
 * - for_you : score + diversité gloutonne (même entreprise ou catégorie
 *   consécutive pénalisée, répétitions d'une entreprise pénalisées).
 * - other : catégories hors saison/intérêts d'abord, puis récents.
 * Aucun projet n'est retiré : seul l'ordre change.
 */
export function rankProjects<T extends RankableProject>(items: T[], ctx: RankingContext, mode: SortMode): T[] {
  const recent = [...items].sort(byRecent);
  if (mode === "recent") return recent;
  if (mode === "other") {
    const boosted = new Set([...SEASON_CATEGORIES[quebecSeason(ctx.now)], ...(ctx.likedCategories ?? [])]);
    const usual = (p: T) => { const c = categoryOf(p); return c && boosted.has(c) ? 1 : 0; };
    return recent.map((p, i) => ({ p, i, u: usual(p) })).sort((a, b) => a.u - b.u || a.i - b.i).map((x) => x.p);
  }
  const pool = recent.map((p, i) => ({ p, i, base: scoreProject(p, ctx).total }));
  const out: T[] = [];
  const seenAuthor = new Map<string, number>();
  while (pool.length) {
    const prev = out[out.length - 1];
    let best = 0; let bestScore = -Infinity;
    pool.forEach((x, k) => {
      const a = authorOf(x.p);
      let s = x.base - (a ? (seenAuthor.get(a) ?? 0) * 1.5 : 0);
      if (prev && a && a === authorOf(prev)) s -= 2.5;
      if (prev && categoryOf(prev) && categoryOf(prev) === categoryOf(x.p)) s -= 1;
      if (s > bestScore || (s === bestScore && x.i < pool[best].i)) { bestScore = s; best = k; }
    });
    const [pick] = pool.splice(best, 1);
    out.push(pick.p);
    const a = authorOf(pick.p);
    if (a) seenAuthor.set(a, (seenAuthor.get(a) ?? 0) + 1);
  }
  return out;
}

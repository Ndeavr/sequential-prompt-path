/**
 * UNPRO — Taxonomie canonique des métiers et sous-services.
 * Source unique : table `service_categories` (parent = métier principal,
 * enfants = sous-services). Aucun libellé de catégorie codé en dur ailleurs.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TradeNode {
  id: string;
  slug: string;
  label: string;
  labelEn: string | null;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  keywords: string[];
}

export interface TradeTaxonomy {
  /** Métiers principaux (racines), triés. */
  trades: TradeNode[];
  /** Sous-services par identifiant de métier principal. */
  children: Map<string, TradeNode[]>;
  bySlug: Map<string, TradeNode>;
}

/** Normalisation stable : sans accents, sans casse, sans ponctuation. */
export function normalizeTerm(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const EMPTY: TradeTaxonomy = { trades: [], children: new Map(), bySlug: new Map() };

function buildTaxonomy(rows: any[]): TradeTaxonomy {
  const nodes: TradeNode[] = rows.map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    label: (r.name_fr || r.name || r.slug) as string,
    labelEn: (r.name_en ?? null) as string | null,
    description: (r.description_fr ?? null) as string | null,
    parentId: (r.parent_id ?? null) as string | null,
    sortOrder: (r.sort_order ?? 0) as number,
    keywords: ((r.ai_keywords ?? []) as string[]),
  }));

  const bySlug = new Map(nodes.map((n) => [n.slug, n]));
  const children = new Map<string, TradeNode[]>();
  for (const n of nodes) {
    if (!n.parentId) continue;
    const list = children.get(n.parentId) ?? [];
    list.push(n);
    children.set(n.parentId, list);
  }
  for (const list of children.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "fr"));
  }
  const trades = nodes
    .filter((n) => !n.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "fr"));

  return { trades, children, bySlug };
}

/**
 * Détecte le métier principal à partir d'un texte réel (nom d'entreprise,
 * catégorie Google, site Web). Renvoie `null` plutôt que de deviner.
 */
export function detectTrade(taxonomy: TradeTaxonomy, ...inputs: (string | null | undefined)[]): TradeNode | null {
  const haystack = normalizeTerm(inputs.filter(Boolean).join(" "));
  if (!haystack) return null;

  // 1. Correspondance exacte de slug ou de libellé.
  for (const trade of taxonomy.trades) {
    if (normalizeTerm(trade.slug) === haystack || normalizeTerm(trade.label) === haystack) return trade;
  }

  // 2. Mot-clé de détection présent dans le texte (le plus long gagne).
  let best: { trade: TradeNode; score: number } | null = null;
  for (const trade of taxonomy.trades) {
    const terms = [trade.label, trade.slug, ...trade.keywords].map(normalizeTerm).filter(Boolean);
    for (const term of terms) {
      if (term.length < 4) continue;
      if (haystack.includes(term) && (!best || term.length > best.score)) {
        best = { trade, score: term.length };
      }
    }
  }
  if (best) return best.trade;

  // 3. Un sous-service reconnu remonte à son métier parent.
  for (const [parentId, list] of taxonomy.children) {
    for (const child of list) {
      const terms = [child.label, ...child.keywords].map(normalizeTerm).filter(Boolean);
      if (terms.some((t) => t.length >= 4 && haystack.includes(t))) {
        const parent = taxonomy.trades.find((t) => t.id === parentId);
        if (parent) return parent;
      }
    }
  }
  return null;
}

/** Sous-services d'un métier principal, par slug. Jamais d'autre métier. */
export function servicesForTrade(taxonomy: TradeTaxonomy, tradeSlug: string | null | undefined): TradeNode[] {
  if (!tradeSlug) return [];
  const trade = taxonomy.bySlug.get(tradeSlug);
  if (!trade || trade.parentId) return [];
  return taxonomy.children.get(trade.id) ?? [];
}

/** Recherche accent-insensible dans les métiers et leurs sous-services. */
export function searchTaxonomy(taxonomy: TradeTaxonomy, query: string): TradeNode[] {
  const q = normalizeTerm(query);
  if (!q) return taxonomy.trades;
  return taxonomy.trades.filter((t) => {
    const own = [t.label, t.slug, ...t.keywords].map(normalizeTerm);
    if (own.some((v) => v.includes(q))) return true;
    const kids = taxonomy.children.get(t.id) ?? [];
    return kids.some((c) => [c.label, ...c.keywords].map(normalizeTerm).some((v) => v.includes(q)));
  });
}

export function useTradeTaxonomy() {
  const query = useQuery({
    queryKey: ["trade-taxonomy"],
    queryFn: async (): Promise<TradeTaxonomy> => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("id, slug, name, name_fr, name_en, description_fr, parent_id, sort_order, ai_keywords")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return buildTaxonomy(data ?? []);
    },
    staleTime: 10 * 60 * 1000,
  });

  const taxonomy = query.data ?? EMPTY;
  return useMemo(
    () => ({
      taxonomy,
      trades: taxonomy.trades,
      isLoading: query.isLoading,
      error: query.error as Error | null,
    }),
    [taxonomy, query.isLoading, query.error],
  );
}

export const __test = { buildTaxonomy };

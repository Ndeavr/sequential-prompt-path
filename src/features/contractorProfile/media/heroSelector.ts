/**
 * UNPRO — Hero image selector.
 * Deterministic priority per trade family. Explicit denylist for stock tropes.
 */
import type { MediaAsset, MediaCategory } from "../generator/pageTypes";
import { normalizeImageUrl } from "@/lib/normalizeImageUrl";

const DEFAULT_PRIORITY: MediaCategory[] = ["completed_project", "before_after", "team", "vehicle", "service", "logo"];

const TRADE_PRIORITY: Record<string, MediaCategory[]> = {
  isolation: ["completed_project", "before_after", "team", "vehicle", "service", "logo"],
  toiture: ["completed_project", "before_after", "vehicle", "team", "service", "logo"],
  roofing: ["completed_project", "before_after", "vehicle", "team", "service", "logo"],
  plomberie: ["service", "completed_project", "vehicle", "team", "before_after", "logo"],
  electricite: ["service", "completed_project", "vehicle", "team", "before_after", "logo"],
};

const STOCK_TROPE_TAGS = new Set([
  "handshake",
  "generic_office",
  "smiling_family",
  "stock_people",
  "office_meeting",
]);

export function selectHeroImage(assets: MediaAsset[], tradeSlug?: string): MediaAsset | null {
  const priority = TRADE_PRIORITY[tradeSlug ?? ""] ?? DEFAULT_PRIORITY;
  const usable = assets.filter((a) => {
    if (!normalizeImageUrl(a.url)) return false;
    if (a.tags.some((t) => STOCK_TROPE_TAGS.has(t))) return false;
    return true;
  });
  for (const cat of priority) {
    const match = usable.find((a) => a.category === cat);
    if (match) return match;
  }
  return usable[0] ?? null;
}

export function isStockTrope(asset: MediaAsset): boolean {
  return asset.tags.some((t) => STOCK_TROPE_TAGS.has(t));
}

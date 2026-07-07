/**
 * UNPRO — Media contract enforcement.
 * Every profile must resolve ≥6 images across the required categories.
 * Missing slots return placeholder tokens; the UI renders IntelligentPlaceholder.
 */
import { MEDIA_MINIMUM, MEDIA_CATEGORIES, type MediaAsset, type MediaCategory } from "../generator/pageTypes";
import { normalizeImageUrl } from "@/lib/normalizeImageUrl";

export interface ResolvedMediaSlot {
  category: MediaCategory;
  asset: MediaAsset | null;
  isPlaceholder: boolean;
}

/** Returns exactly `MEDIA_MINIMUM` slots, one per required category (in canonical order). */
export function resolveGallerySlots(assets: MediaAsset[]): ResolvedMediaSlot[] {
  const byCategory = new Map<MediaCategory, MediaAsset[]>();
  for (const asset of assets) {
    const normalized = normalizeImageUrl(asset.url);
    if (!normalized) continue;
    if (!byCategory.has(asset.category)) byCategory.set(asset.category, []);
    byCategory.get(asset.category)!.push({ ...asset, url: normalized });
  }

  return MEDIA_CATEGORIES.slice(0, MEDIA_MINIMUM).map((category) => {
    const list = byCategory.get(category) ?? [];
    const asset = list[0] ?? null;
    return { category, asset, isPlaceholder: !asset };
  });
}

export function countVerifiedAssets(assets: MediaAsset[]): number {
  return assets.filter((a) => normalizeImageUrl(a.url)).length;
}

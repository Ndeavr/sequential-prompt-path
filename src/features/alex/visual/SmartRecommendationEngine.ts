/**
 * SmartRecommendationEngine — reads past visual preferences and recommends
 * which of 2 proposed styles is the safest bet for this user.
 */
import { supabase } from "@/integrations/supabase/client";
import type { VisualStyleOption } from "./types";

export interface UserStyleProfile {
  dominant_style: string | null;
  total_choices: number;
  rejected_styles: string[];
}

export async function getUserStyleProfile(): Promise<UserStyleProfile> {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return { dominant_style: null, total_choices: 0, rejected_styles: [] };

    const { data } = await supabase
      .from("user_visual_preferences")
      .select("selected_style, rejected_style")
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!data?.length) return { dominant_style: null, total_choices: 0, rejected_styles: [] };

    const counts: Record<string, number> = {};
    for (const row of data) {
      if (row.selected_style) counts[row.selected_style] = (counts[row.selected_style] || 0) + 1;
    }
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const rejected = Array.from(new Set(data.map((r) => r.rejected_style).filter(Boolean) as string[]));

    return { dominant_style: dominant, total_choices: data.length, rejected_styles: rejected };
  } catch {
    return { dominant_style: null, total_choices: 0, rejected_styles: [] };
  }
}

/** Returns id of the recommended option (or null if no prior signal). */
export function recommendStyle(
  options: VisualStyleOption[],
  profile: UserStyleProfile,
): { recommendedId: string | null; reason: string | null } {
  if (!profile.dominant_style || profile.total_choices < 1) {
    return { recommendedId: null, reason: null };
  }
  const lowerDom = profile.dominant_style.toLowerCase();
  const match = options.find(
    (o) => o.id.toLowerCase().includes(lowerDom) || o.label.toLowerCase().includes(lowerDom),
  );
  if (match) {
    return {
      recommendedId: match.id,
      reason: `Vous avez déjà choisi ce style ${profile.total_choices} fois. Bon match.`,
    };
  }
  // No textual match — pick the one that does NOT match a rejected style.
  const safe = options.find((o) => !profile.rejected_styles.some((r) => o.id.toLowerCase().includes(r.toLowerCase())));
  if (safe) {
    return {
      recommendedId: safe.id,
      reason: "Choix le moins risqué selon vos préférences passées.",
    };
  }
  return { recommendedId: null, reason: null };
}

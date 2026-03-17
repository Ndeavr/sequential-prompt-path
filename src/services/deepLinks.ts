/**
 * UNPRO — Smart Deep Link Resolver
 * Resolves /i/{code} to feature experiences.
 */

import { supabase } from "@/integrations/supabase/client";
import { saveAuthIntent } from "@/services/auth/authIntentService";

export interface DeepLink {
  id: string;
  code: string;
  feature: string;
  sub_feature: string | null;
  role: string;
  context_json: Record<string, unknown>;
  created_at: string;
}

export interface ResolvedDeepLink {
  valid: boolean;
  link?: DeepLink;
  targetPath: string;
  requiresAuth: boolean;
  reason?: string;
}

const FEATURE_ROUTES: Record<string, (sub?: string | null, ctx?: Record<string, unknown>) => string> = {
  design: (sub) => sub ? `/design?room=${sub}` : "/design",
  home_score: () => "/score-maison",
  booking: (_sub, ctx) => ctx?.contractorId ? `/dashboard/appointments?contractor=${ctx.contractorId}` : "/dashboard/appointments",
  passport: (_sub, ctx) => ctx?.propertyId ? `/dashboard/properties/${ctx.propertyId}/passport` : "/dashboard",
  energy: () => "/energy",
  alex: (sub) => sub ? `/alex?topic=${sub}` : "/alex",
  compare: () => "/compare-quotes",
  verify: (_sub, ctx) => ctx?.contractorSlug ? `/verify?q=${ctx.contractorSlug}` : "/verifier-entrepreneur",
};

const AUTH_REQUIRED_FEATURES = new Set(["booking", "passport"]);

export async function resolveDeepLink(code: string): Promise<ResolvedDeepLink> {
  const { data, error } = await supabase
    .from("deep_links")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) {
    return { valid: false, targetPath: "/", requiresAuth: false, reason: "not_found" };
  }

  const link = data as unknown as DeepLink;
  const routeFn = FEATURE_ROUTES[link.feature];
  const targetPath = routeFn
    ? routeFn(link.sub_feature, link.context_json as Record<string, unknown>)
    : "/";

  return {
    valid: true,
    link,
    targetPath,
    requiresAuth: AUTH_REQUIRED_FEATURES.has(link.feature),
  };
}

/** Store deep link intent before auth redirect */
export function saveDeepLinkIntent(resolved: ResolvedDeepLink) {
  if (!resolved.valid || !resolved.link) return;
  saveAuthIntent({
    returnPath: resolved.targetPath,
    action: `deep_link:${resolved.link.feature}`,
    roleHint: resolved.link.role,
    metadata: {
      deepLinkCode: resolved.link.code,
      feature: resolved.link.feature,
      sub_feature: resolved.link.sub_feature,
      context: resolved.link.context_json,
    },
  });
}

/** Feature metadata for landing pages */
export const FEATURE_META: Record<string, { icon: string; headline: string; description: string; previewColor: string }> = {
  design: {
    icon: "Palette",
    headline: "Visualisez votre rénovation",
    description: "Utilisez l'IA pour imaginer votre nouvelle cuisine, salle de bain ou espace de vie.",
    previewColor: "from-violet-500/20 to-fuchsia-500/20",
  },
  home_score: {
    icon: "BarChart3",
    headline: "Score Maison gratuit",
    description: "Évaluez l'état de votre propriété en 2 minutes et recevez des recommandations personnalisées.",
    previewColor: "from-emerald-500/20 to-teal-500/20",
  },
  booking: {
    icon: "CalendarCheck",
    headline: "Rendez-vous garanti",
    description: "Réservez un rendez-vous exclusif avec un entrepreneur vérifié, sans attente.",
    previewColor: "from-blue-500/20 to-cyan-500/20",
  },
  passport: {
    icon: "Shield",
    headline: "Passeport Maison",
    description: "Accédez au dossier complet de votre propriété — historique, documents, état.",
    previewColor: "from-amber-500/20 to-orange-500/20",
  },
  energy: {
    icon: "Zap",
    headline: "Bilan énergétique",
    description: "Découvrez les économies possibles sur votre consommation d'énergie.",
    previewColor: "from-yellow-500/20 to-lime-500/20",
  },
  alex: {
    icon: "Bot",
    headline: "Parlez à Alex",
    description: "Posez vos questions sur votre maison à notre assistant IA spécialisé.",
    previewColor: "from-indigo-500/20 to-purple-500/20",
  },
};

/**
 * UNPRO — Fallback Route Page
 * Any unknown path either:
 *   1. Matches PLACEHOLDER_PATH_RE (test/demo/etc) → redirect to `/`
 *   2. Otherwise → DB-driven fallback landing template
 * No public route ever renders a "coming soon" page.
 */
import { useLocation, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FallbackLandingTemplateUNPRO from "@/components/fallback-pages/FallbackLandingTemplateUNPRO";
import { PLACEHOLDER_PATH_RE } from "@/config/routeRegistry";

export default function FallbackRoutePage() {
  const { pathname } = useLocation();

  if (PLACEHOLDER_PATH_RE.test(pathname)) {
    return <Navigate to="/" replace />;
  }

  const pageKey = pathname.replace(/^\//, "").replace(/\//g, "-") || "default";

  const { data: fallbackData } = useQuery({
    queryKey: ["fallback-page", pageKey],
    queryFn: async () => {
      const { data } = await supabase
        .from("navigation_fallback_pages")
        .select("*")
        .eq("page_key", pageKey)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
  });

  const mapped = fallbackData
    ? {
        title: fallbackData.title,
        subtitle: fallbackData.subtitle || undefined,
        primaryCtaLabel: fallbackData.primary_cta_label || undefined,
        primaryCtaPath: fallbackData.primary_cta_path || undefined,
        secondaryCtaLabel: fallbackData.secondary_cta_label || undefined,
        secondaryCtaPath: fallbackData.secondary_cta_path || undefined,
        benefits: Array.isArray(fallbackData.benefits_json) ? (fallbackData.benefits_json as string[]) : [],
        faq: Array.isArray(fallbackData.faq_json) ? (fallbackData.faq_json as { q: string; a: string }[]) : [],
      }
    : undefined;

  return <FallbackLandingTemplateUNPRO data={mapped} pageKey={pageKey} />;
}

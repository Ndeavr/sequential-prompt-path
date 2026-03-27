/**
 * UNPRO — Fallback Route Page
 * Catches unbuilt routes and renders a premium fallback landing
 * using DB-driven content from navigation_fallback_pages.
 */
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FallbackLandingTemplateUNPRO from "@/components/fallback-pages/FallbackLandingTemplateUNPRO";

export default function FallbackRoutePage() {
  const { pathname } = useLocation();

  // Derive page_key from path: /score-aipp → score-aipp, /plans-prix → plans-prix
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

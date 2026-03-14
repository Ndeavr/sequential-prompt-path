/**
 * UNPRO — Intelligent CTA Engine
 * Detects user intent from URL, role, and Alex signals.
 * Returns the best primary + secondary CTA for the current context.
 */

import { useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { supabase } from "@/integrations/supabase/client";

export type UserIntent =
  | "find_contractor"
  | "verify_contractor"
  | "manage_property"
  | "offer_services"
  | "research_problem"
  | "explore_city"
  | "create_project"
  | "default";

export interface CTAConfig {
  intent: UserIntent;
  primary: { label: string; labelEn: string; to: string };
  secondary?: { label: string; labelEn: string; to: string };
}

// ── Intent → CTA mapping ──────────────────────────────────────────
const INTENT_CTA_MAP: Record<UserIntent, CTAConfig> = {
  find_contractor: {
    intent: "find_contractor",
    primary: { label: "Trouver un entrepreneur", labelEn: "Find a Contractor", to: "/recherche" },
    secondary: { label: "Comparer des entrepreneurs", labelEn: "Compare Contractors", to: "/recherche" },
  },
  verify_contractor: {
    intent: "verify_contractor",
    primary: { label: "Vérifier un entrepreneur", labelEn: "Verify a Contractor", to: "/verifier-entrepreneur" },
    secondary: { label: "Analyser un contrat", labelEn: "Analyze a Contract", to: "/alex" },
  },
  manage_property: {
    intent: "manage_property",
    primary: { label: "Créer mon Passeport Maison", labelEn: "Create My Home Passport", to: "/signup" },
    secondary: { label: "Ajouter ma propriété", labelEn: "Add My Property", to: "/dashboard/proprietes/nouvelle" },
  },
  offer_services: {
    intent: "offer_services",
    primary: { label: "Créer mon profil professionnel", labelEn: "Create My Pro Profile", to: "/devenir-entrepreneur" },
    secondary: { label: "Voir les plans disponibles", labelEn: "View Plans", to: "/tarifs" },
  },
  research_problem: {
    intent: "research_problem",
    primary: { label: "Voir les solutions recommandées", labelEn: "See Recommended Solutions", to: "/alex" },
    secondary: { label: "Trouver un expert", labelEn: "Find an Expert", to: "/recherche" },
  },
  explore_city: {
    intent: "explore_city",
    primary: { label: "Voir le score de votre maison", labelEn: "See Your Home Score", to: "/score-maison" },
    secondary: { label: "Trouver un entrepreneur", labelEn: "Find a Contractor", to: "/recherche" },
  },
  create_project: {
    intent: "create_project",
    primary: { label: "Créer un Projet", labelEn: "Create Project", to: "/signup" },
    secondary: { label: "Parler à Alex", labelEn: "Talk to Alex", to: "/alex" },
  },
  default: {
    intent: "default",
    primary: { label: "Créer un Projet", labelEn: "Create Project", to: "/signup" },
    secondary: { label: "Trouver un entrepreneur", labelEn: "Find a Contractor", to: "/recherche" },
  },
};

// ── Role overrides ─────────────────────────────────────────────────
const ROLE_CTA_OVERRIDES: Record<string, Partial<CTAConfig>> = {
  contractor: {
    primary: { label: "Voir les demandes", labelEn: "View Project Requests", to: "/pro/leads" },
  },
  homeowner: {
    primary: { label: "Ajouter une propriété", labelEn: "Add a Property", to: "/dashboard/proprietes/nouvelle" },
  },
  admin: {
    primary: { label: "Tableau de bord", labelEn: "Dashboard", to: "/admin" },
  },
};

// ── URL pattern → intent scoring ───────────────────────────────────
function scoreIntentFromPath(pathname: string): Partial<Record<UserIntent, number>> {
  const scores: Partial<Record<UserIntent, number>> = {};
  const p = pathname.toLowerCase();

  // Service / profession pages
  if (p.startsWith("/service/") || p.startsWith("/profession/") || p.startsWith("/quartier/")) {
    scores.find_contractor = 90;
  }
  // Problem pages
  if (p.startsWith("/probleme") || p.startsWith("/problem")) {
    scores.research_problem = 85;
    scores.find_contractor = 40;
  }
  // Solution pages
  if (p.startsWith("/solution")) {
    scores.research_problem = 80;
    scores.find_contractor = 50;
  }
  // Verify
  if (p.startsWith("/verifier") || p.startsWith("/verify")) {
    scores.verify_contractor = 95;
  }
  // City pages
  if (p.startsWith("/ville/") || p.startsWith("/city/") || p.startsWith("/rue/")) {
    scores.explore_city = 85;
    scores.find_contractor = 30;
  }
  // Passport / property
  if (p.startsWith("/passeport") || p.startsWith("/maison/") || p.startsWith("/dashboard/propriete")) {
    scores.manage_property = 90;
  }
  // Pro / entrepreneurs pages
  if (p === "/professionnels" || p === "/entrepreneurs" || p === "/devenir-entrepreneur" || p.startsWith("/tarifs")) {
    scores.offer_services = 90;
  }
  // Discovery / trending / inspirations
  if (p.startsWith("/inspirations") || p.startsWith("/tendances") || p.startsWith("/transformations")) {
    scores.create_project = 80;
  }
  // Home / root
  if (p === "/" || p === "/index") {
    scores.create_project = 50;
    scores.find_contractor = 30;
  }

  return scores;
}

// ── Alex intent signal (global mutable for cross-component comms) ──
let _alexIntentSignal: UserIntent | null = null;

export function setAlexIntent(intent: UserIntent) {
  _alexIntentSignal = intent;
  // Dispatch event so React re-renders
  window.dispatchEvent(new CustomEvent("alex-intent-change", { detail: intent }));
}

export function clearAlexIntent() {
  _alexIntentSignal = null;
  window.dispatchEvent(new CustomEvent("alex-intent-change", { detail: null }));
}

// ── Main hook ──────────────────────────────────────────────────────
export function useIntentCTA() {
  const { pathname } = useLocation();
  const { ctx, activeRole } = useNavigationContext();
  const { lang } = useLanguage();

  const resolved = useMemo<CTAConfig>(() => {
    // 1. Score from URL
    const urlScores = scoreIntentFromPath(pathname);

    // 2. Alex override (highest priority)
    if (_alexIntentSignal && INTENT_CTA_MAP[_alexIntentSignal]) {
      return INTENT_CTA_MAP[_alexIntentSignal];
    }

    // 3. Pick top intent from URL scores
    let topIntent: UserIntent = "default";
    let topScore = 0;
    for (const [intent, score] of Object.entries(urlScores)) {
      if (score > topScore) {
        topScore = score;
        topIntent = intent as UserIntent;
      }
    }

    const baseCTA = INTENT_CTA_MAP[topIntent] || INTENT_CTA_MAP.default;

    // 4. Role override (only for authenticated users on low-scoring pages)
    if (ctx && activeRole !== "guest" && topScore < 70) {
      const roleOverride = ROLE_CTA_OVERRIDES[activeRole];
      if (roleOverride?.primary) {
        return {
          ...baseCTA,
          primary: roleOverride.primary,
          secondary: baseCTA.secondary,
        };
      }
    }

    return baseCTA;
  }, [pathname, ctx, activeRole]);

  // Contextual label enrichment from URL segments
  const enrichedCTA = useMemo(() => {
    const p = pathname.toLowerCase();
    const cta = { ...resolved };

    // Enrich with city name
    const cityMatch = p.match(/\/ville\/([^/]+)/);
    if (cityMatch && cta.intent === "explore_city") {
      const city = decodeURIComponent(cityMatch[1]).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      cta.primary = {
        ...cta.primary,
        label: `Voir le score à ${city}`,
        labelEn: `See Score in ${city}`,
      };
    }

    // Enrich with service + city
    const serviceMatch = p.match(/\/service\/([^/]+)/);
    if (serviceMatch && cta.intent === "find_contractor") {
      const slug = decodeURIComponent(serviceMatch[1]);
      const parts = slug.split("-");
      // e.g. toiture-montreal → Toiture, Montréal
      if (parts.length >= 2) {
        const service = parts.slice(0, -1).join(" ").replace(/\b\w/g, (c) => c.toUpperCase());
        const city = parts[parts.length - 1].replace(/\b\w/g, (c) => c.toUpperCase());
        cta.primary = {
          ...cta.primary,
          label: `Trouver un entrepreneur ${service} à ${city}`,
          labelEn: `Find ${service} Contractor in ${city}`,
        };
      }
    }

    // Enrich with problem
    const problemMatch = p.match(/\/probleme\/([^/]+)/);
    if (problemMatch && cta.intent === "research_problem") {
      const problem = decodeURIComponent(problemMatch[1]).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      cta.primary = {
        ...cta.primary,
        label: `Trouver un expert : ${problem}`,
        labelEn: `Find Expert: ${problem}`,
      };
    }

    return cta;
  }, [resolved, pathname]);

  const getLabel = useCallback(
    (btn: { label: string; labelEn: string }) => (lang === "en" ? btn.labelEn : btn.label),
    [lang]
  );

  // Analytics tracker
  const trackClick = useCallback(
    (ctaText: string) => {
      supabase
        .from("cta_events")
        .insert({
          cta_text: ctaText,
          intent: enrichedCTA.intent,
          page: pathname,
          user_role: activeRole === "guest" ? null : activeRole,
          user_id: ctx?.user ? undefined : undefined, // privacy-safe
        })
        .then(() => {});
    },
    [enrichedCTA.intent, pathname, activeRole, ctx]
  );

  return {
    intent: enrichedCTA.intent,
    primary: enrichedCTA.primary,
    secondary: enrichedCTA.secondary,
    getLabel,
    trackClick,
  };
}

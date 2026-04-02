/**
 * HeroIntentSwitcher — Projet · Problème · Photo intent selector.
 * Supports "headline-switch" and "pill-switch" display modes.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Sparkles, Search, ArrowRight, Wrench, AlertTriangle, ImageIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

export type IntentSlug = "projet" | "probleme" | "photo";
export type DisplayMode = "headline-switch" | "pill-switch";

interface IntentOption {
  slug: IntentSlug;
  label_fr: string;
  label_en: string;
  headline_fr: string;
  subtext_fr: string;
  subtext_en: string;
  icon: LucideIcon;
  ctas: { label: string; route: string; primary?: boolean }[];
}

const INTENT_OPTIONS: IntentOption[] = [
  {
    slug: "projet",
    label_fr: "Projet",
    label_en: "Project",
    headline_fr: "Projet",
    subtext_fr: "Décrivez ce que vous voulez créer, rénover ou améliorer.",
    subtext_en: "Describe what you want to create, renovate or improve.",
    icon: Sparkles,
    ctas: [
      { label: "Lancer un projet", route: "/describe-project", primary: true },
      { label: "Voir des idées", route: "/inspirations" },
    ],
  },
  {
    slug: "probleme",
    label_fr: "Problème",
    label_en: "Problem",
    headline_fr: "Problème",
    subtext_fr: "Montrez ou décrivez ce qui ne va pas. On vous aide à comprendre.",
    subtext_en: "Show or describe the issue. We'll help you understand.",
    icon: AlertTriangle,
    ctas: [
      { label: "Détecter un problème", route: "/describe-project?intent=problem", primary: true },
      { label: "Obtenir une piste", route: "/describe-project?intent=diagnostic" },
    ],
  },
  {
    slug: "photo",
    label_fr: "Photo",
    label_en: "Photo",
    headline_fr: "Photo",
    subtext_fr: "Téléversez une image pour analyser, comparer ou transformer.",
    subtext_en: "Upload an image to analyze, compare or transform.",
    icon: Camera,
    ctas: [
      { label: "Analyser une photo", route: "/describe-project?intent=photo", primary: true },
      { label: "Améliorer un design", route: "/describe-project?intent=design" },
    ],
  },
];

interface Props {
  defaultIntent?: IntentSlug;
  displayMode?: DisplayMode;
  onIntentChange?: (slug: IntentSlug) => void;
}

export default function HeroIntentSwitcher({
  defaultIntent = "photo",
  displayMode = "headline-switch",
  onIntentChange,
}: Props) {
  const [active, setActive] = useState<IntentSlug>(defaultIntent);

  const handleSelect = useCallback((slug: IntentSlug) => {
    setActive(slug);
    onIntentChange?.(slug);
  }, [onIntentChange]);

  const current = INTENT_OPTIONS.find((o) => o.slug === active)!;

  if (displayMode === "pill-switch") {
    return (
      <div className="w-full flex flex-col items-center gap-4">
        {/* Pills */}
        <div className="flex items-center gap-2">
          {INTENT_OPTIONS.map((opt) => {
            const isActive = opt.slug === active;
            return (
              <button
                key={opt.slug}
                onClick={() => handleSelect(opt.slug)}
                className={`relative flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "text-primary-foreground"
                    : "text-white/50 hover:text-white/70"
                }`}
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, hsl(222 100% 55% / 0.85), hsl(222 100% 40% / 0.9))"
                    : "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(12px)",
                  border: isActive
                    ? "1px solid hsl(222 100% 70% / 0.4)"
                    : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: isActive ? "0 0 24px hsl(222 100% 60% / 0.25)" : "none",
                }}
              >
                <opt.icon className="h-3.5 w-3.5" />
                {opt.label_fr}
              </button>
            );
          })}
        </div>

        {/* Dynamic subtext */}
        <AnimatePresence mode="wait">
          <motion.p
            key={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-white/60 max-w-xs text-center leading-relaxed"
          >
            {current.subtext_fr}
          </motion.p>
        </AnimatePresence>

        {/* CTAs */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`ctas-${active}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="flex flex-wrap justify-center gap-2"
          >
            {current.ctas.map((cta) => (
              <Link
                key={cta.label}
                to={cta.route}
                className={`flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-medium transition-all active:scale-[0.97] ${
                  cta.primary
                    ? "cta-gradient text-primary-foreground"
                    : "text-white/70 hover:text-white"
                }`}
                style={
                  !cta.primary
                    ? {
                        background: "rgba(255,255,255,0.06)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }
                    : undefined
                }
              >
                {cta.label}
                {cta.primary && <ArrowRight className="h-3.5 w-3.5" />}
              </Link>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // ── headline-switch (default) ──
  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Headline words */}
      <div className="flex items-baseline gap-3 sm:gap-5">
        {INTENT_OPTIONS.map((opt) => {
          const isActive = opt.slug === active;
          return (
            <motion.button
              key={opt.slug}
              onClick={() => handleSelect(opt.slug)}
              className="relative focus:outline-none"
              whileTap={{ scale: 0.96 }}
            >
              <motion.span
                className={`font-display font-bold tracking-tight transition-all duration-200 ${
                  isActive
                    ? "text-primary text-[28px] sm:text-[36px] md:text-[48px]"
                    : "text-white/40 text-[22px] sm:text-[28px] md:text-[36px] hover:text-white/60"
                }`}
                layout
              >
                {opt.label_fr}
              </motion.span>

              {/* Active glow underline */}
              {isActive && (
                <motion.div
                  layoutId="intent-underline"
                  className="absolute -bottom-1 left-0 right-0 h-[2px] rounded-full"
                  style={{
                    background: "linear-gradient(90deg, hsl(222 100% 65% / 0.6), hsl(222 100% 65% / 0.1))",
                    boxShadow: "0 0 12px hsl(222 100% 65% / 0.3)",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Dynamic subtext */}
      <AnimatePresence mode="wait">
        <motion.p
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="text-sm sm:text-base text-white/60 max-w-sm text-center leading-relaxed"
        >
          {current.subtext_fr}
        </motion.p>
      </AnimatePresence>

      {/* Context CTAs */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`ctas-${active}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="flex flex-wrap justify-center gap-2 pt-1"
        >
          {current.ctas.map((cta) => (
            <Link
              key={cta.label}
              to={cta.route}
              className={`flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium transition-all active:scale-[0.97] ${
                cta.primary
                  ? "cta-gradient text-primary-foreground"
                  : "text-white/70 hover:text-white"
              }`}
              style={
                !cta.primary
                  ? {
                      background: "rgba(255,255,255,0.06)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }
                  : undefined
              }
            >
              {cta.label}
              {cta.primary && <ArrowRight className="h-3.5 w-3.5" />}
            </Link>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * HeroSectionIntentWithAlexOrb — Hero section with integrated Alex Orb,
 * compact counter, and mini realtime graph. Used across all 5 intent pages.
 */
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import OrbAlexPrimaryEntry from "./OrbAlexPrimaryEntry";
import WidgetCounterCompactRealtime, { type CounterMetric } from "@/components/impact-counter/WidgetCounterCompactRealtime";
import GraphMiniRealtime, { type GraphStyle } from "@/components/impact-counter/GraphMiniRealtime";

interface CTA {
  label: string;
  onClick: () => void;
}

interface Props {
  title: string;
  subtitle?: string;
  intentFeature?: string;
  ctaPrimary: CTA;
  ctaSecondary?: CTA;
  counterPrimary: CounterMetric;
  counterSecondary?: CounterMetric;
  graphStyle?: GraphStyle;
  graphBaseValue?: number;
  className?: string;
}

export default function HeroSectionIntentWithAlexOrb({
  title,
  subtitle,
  intentFeature = "general",
  ctaPrimary,
  ctaSecondary,
  counterPrimary,
  counterSecondary,
  graphStyle = "smooth",
  graphBaseValue = 100,
  className,
}: Props) {
  return (
    <section className={cn("relative px-5 pt-16 pb-8 text-center overflow-hidden", className)}>
      {/* Aura background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/6 blur-[140px]" />
      </div>

      {/* Alex Orb — dominant, above the fold */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
        className="flex justify-center mb-5"
      >
        <OrbAlexPrimaryEntry intentFeature={intentFeature} size="lg" />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="text-xl sm:text-2xl md:text-3xl font-bold font-display text-foreground max-w-xl mx-auto leading-tight"
      >
        {title}
      </motion.h1>

      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="mt-2.5 text-sm text-muted-foreground max-w-md mx-auto"
        >
          {subtitle}
        </motion.p>
      )}

      {/* Compact counter + mini graph */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="mt-5 flex flex-col items-center gap-2"
      >
        <WidgetCounterCompactRealtime primary={counterPrimary} secondary={counterSecondary} />
        <div className="w-full max-w-[200px]">
          <GraphMiniRealtime style={graphStyle} baseValue={graphBaseValue} points={30} className="h-8" />
        </div>
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.35 }}
        className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3"
      >
        <Button size="lg" onClick={ctaPrimary.onClick} className="min-w-[200px]">
          {ctaPrimary.label}
        </Button>
        {ctaSecondary && (
          <Button size="lg" variant="outline" onClick={ctaSecondary.onClick} className="min-w-[200px]">
            {ctaSecondary.label}
          </Button>
        )}
      </motion.div>
    </section>
  );
}

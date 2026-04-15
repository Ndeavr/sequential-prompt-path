/**
 * HeroSectionPainTriggerDynamic — Hero that morphs based on selected pain.
 * Zero reload. Instant animation. 
 */
import { motion, AnimatePresence } from "framer-motion";
import { type PainOption, type ConversionStage } from "@/hooks/useAdaptiveSession";
import CTAAdaptivePrimary from "./CTAAdaptivePrimary";

interface Props {
  defaultTitle: string;
  defaultSub: string;
  defaultCta: string;
  defaultCtaHref: string;
  selectedPain: PainOption | null;
  stage: ConversionStage;
  onCtaClick: () => void;
}

export default function HeroSectionPainTriggerDynamic({
  defaultTitle,
  defaultSub,
  defaultCta,
  defaultCtaHref,
  selectedPain,
  stage,
  onCtaClick,
}: Props) {
  const title = selectedPain?.heroTitle ?? defaultTitle;
  const sub = selectedPain?.heroSub ?? defaultSub;
  const ctaLabel = selectedPain?.ctaLabel ?? defaultCta;

  return (
    <section className="relative min-h-[50vh] flex flex-col items-center justify-center px-5 pt-16 pb-8 text-center overflow-hidden">
      {/* Aura — shifts hue on selection */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px]"
          animate={{
            background: selectedPain
              ? "radial-gradient(circle, hsl(var(--primary) / 0.12), transparent 70%)"
              : "radial-gradient(circle, hsl(var(--primary) / 0.06), transparent 70%)",
            scale: selectedPain ? 1.15 : 1,
          }}
          transition={{ duration: 0.6 }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.h1
          key={title}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35 }}
          className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 max-w-2xl font-display"
        >
          {title}
        </motion.h1>
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.p
          key={sub}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="text-base md:text-lg text-muted-foreground mb-8 max-w-lg"
        >
          {sub}
        </motion.p>
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={ctaLabel}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25, delay: 0.1 }}
        >
          <CTAAdaptivePrimary label={ctaLabel} onClick={onCtaClick} stage={stage} />
        </motion.div>
      </AnimatePresence>

      {/* Benefits that appear on selection */}
      <AnimatePresence>
        {selectedPain && (
          <motion.ul
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="mt-6 space-y-2 text-sm text-muted-foreground max-w-md"
          >
            {selectedPain.benefits.map((b, i) => (
              <motion.li
                key={b}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.07 }}
                className="flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {b}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}

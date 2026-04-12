/**
 * UNPRO — FunnelLayout
 * Shared layout wrapper for all contractor funnel pages.
 * Premium dark-first, mobile-first with progress bar.
 */
import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion";
import FunnelProgressBar from "./FunnelProgressBar";
import type { FunnelStep } from "@/types/contractorFunnel";

interface Props {
  children: ReactNode;
  currentStep: FunnelStep;
  showProgress?: boolean;
  className?: string;
  /** Narrow (720px) | default (1024px) | wide (1280px) */
  width?: "narrow" | "default" | "wide";
}

const widthMap = {
  narrow: "max-w-3xl",
  default: "max-w-4xl",
  wide: "max-w-screen-xl",
} as const;

export default function FunnelLayout({
  children,
  currentStep,
  showProgress = true,
  className,
  width = "default",
}: Props) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header with progress */}
      {showProgress && (
        <div className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className={cn("mx-auto px-4 py-3", widthMap[width])}>
            <div className="flex items-center gap-3">
              <UnproLogo size={100} variant="primary" animated={false} showWordmark={false} />
              <div className="flex-1">
                <FunnelProgressBar currentStep={currentStep} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <motion.main
        className={cn(
          "mx-auto px-4 py-8 sm:py-12",
          widthMap[width],
          className,
        )}
        initial="hidden"
        animate="visible"
        variants={fadeUp}
      >
        {children}
      </motion.main>
    </div>
  );
}

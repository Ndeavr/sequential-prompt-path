/**
 * UNPRO — SmartCTA
 * Intent-driven CTA button that adapts to page context, role, and Alex signals.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useIntentCTA } from "@/hooks/useIntentCTA";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface SmartCTAProps {
  variant?: "header" | "hero" | "inline";
  showSecondary?: boolean;
  className?: string;
}

export default function SmartCTA({ variant = "inline", showSecondary = false, className = "" }: SmartCTAProps) {
  const { primary, secondary, getLabel, trackClick } = useIntentCTA();

  const primaryLabel = getLabel(primary);
  const secondaryLabel = secondary ? getLabel(secondary) : "";

  if (variant === "header") {
    return (
      <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className={className}>
        <Button asChild size="sm" className="rounded-full h-8 text-xs px-4 font-semibold">
          <Link to={primary.to} onClick={() => trackClick(primaryLabel)}>
            {primaryLabel}
          </Link>
        </Button>
      </motion.div>
    );
  }

  if (variant === "hero") {
    return (
      <div className={`flex flex-col sm:flex-row items-center gap-3 ${className}`}>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
          <Button asChild size="lg" className="rounded-full px-8 h-12 text-sm font-bold shadow-lg">
            <Link to={primary.to} onClick={() => trackClick(primaryLabel)}>
              {primaryLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
        {showSecondary && secondary && (
          <Button asChild variant="outline" size="lg" className="rounded-full px-6 h-12 text-sm">
            <Link to={secondary.to} onClick={() => trackClick(secondaryLabel)}>
              {secondaryLabel}
            </Link>
          </Button>
        )}
      </div>
    );
  }

  // inline
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
        <Button asChild className="rounded-full px-6 font-semibold">
          <Link to={primary.to} onClick={() => trackClick(primaryLabel)}>
            {primaryLabel}
          </Link>
        </Button>
      </motion.div>
      {showSecondary && secondary && (
        <Button asChild variant="outline" className="rounded-full px-5">
          <Link to={secondary.to} onClick={() => trackClick(secondaryLabel)}>
            {secondaryLabel}
          </Link>
        </Button>
      )}
    </div>
  );
}

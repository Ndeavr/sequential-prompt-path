/**
 * MatchingDoubleWheel — Two CriteriaWheels (homeowner/contractor) converging into a match.
 * Lazy-loaded — used on match results screens.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import CriteriaWheel from "./CriteriaWheel";
import { useUnproSound } from "@/hooks/useUnproSound";
import { cn } from "@/lib/utils";

interface Props {
  homeownerCriteria: string[];
  contractorCriteria: string[];
  /** Triggers the converge → match sequence */
  matched: boolean;
  onMatched?: () => void;
  className?: string;
}

export default function MatchingDoubleWheel({
  homeownerCriteria,
  contractorCriteria,
  matched,
  onMatched,
  className,
}: Props) {
  const total = Math.max(homeownerCriteria.length, contractorCriteria.length);
  const [active, setActive] = useState(0);
  const { criteriaClick, vaultClack } = useUnproSound();

  // Tick criteria in one by one
  useEffect(() => {
    if (active >= total) return;
    const t = window.setTimeout(() => {
      criteriaClick();
      setActive((a) => a + 1);
    }, 220);
    return () => clearTimeout(t);
  }, [active, total, criteriaClick]);

  // On match: double clack + callback
  useEffect(() => {
    if (matched && active >= total) {
      vaultClack();
      const t = window.setTimeout(() => {
        vaultClack();
        onMatched?.();
      }, 140);
      return () => clearTimeout(t);
    }
  }, [matched, active, total, vaultClack, onMatched]);

  return (
    <div
      className={cn(
        "relative grid grid-cols-2 items-center justify-items-center gap-4",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={matched ? "Match trouvé" : "Recherche du meilleur match"}
    >
      <CriteriaWheel
        side="left"
        criteria={homeownerCriteria}
        activeIndex={Math.min(active, homeownerCriteria.length)}
        matched={matched}
      />
      <CriteriaWheel
        side="right"
        criteria={contractorCriteria}
        activeIndex={Math.min(active, contractorCriteria.length)}
        matched={matched}
      />
      {/* Center connector */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-px w-24 bg-gradient-to-r from-primary via-accent to-primary"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{
          scaleX: matched && active >= total ? 1 : 0.4,
          opacity: matched && active >= total ? 1 : 0.4,
        }}
        transition={{ duration: 0.4, ease: [0.7, 0, 0.2, 1] }}
        style={{ transformOrigin: "center" }}
      />
    </div>
  );
}

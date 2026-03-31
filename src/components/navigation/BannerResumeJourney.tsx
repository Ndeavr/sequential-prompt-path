/**
 * UNPRO — Banner Resume Journey
 * Shown when a user has an active journey they can resume.
 */
import { ArrowRight, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getLatestSnapshot, clearSnapshot } from "@/services/navigation/journeyService";
import { useState, useEffect } from "react";

const JOURNEY_LABELS: Record<string, string> = {
  homeowner: "Propriétaire",
  contractor: "Entrepreneur",
  condo_manager: "Gestionnaire condo",
  admin: "Administration",
};

export default function BannerResumeJourney() {
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(getLatestSnapshot());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setSnapshot(getLatestSnapshot());
  }, []);

  if (!snapshot || dismissed) return null;

  const journeyLabel = JOURNEY_LABELS[snapshot.activeJourney] || snapshot.activeJourney;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className="mx-4 mt-3 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-xl p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <RotateCcw className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                Reprendre votre parcours {journeyLabel}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Nous vous ramenons là où vous étiez rendu
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                clearSnapshot();
                setDismissed(true);
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              Ignorer
            </button>
            <button
              onClick={() => {
                navigate(snapshot.routePath);
                clearSnapshot();
                setDismissed(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Reprendre
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

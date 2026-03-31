/**
 * UNPRO — Banner Continue Flow
 * Shows a persistent banner when user has an active flow session.
 * Allows one-click resume to the correct step.
 */
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getActiveFlowSession,
  getStepRoute,
  type FlowSession,
} from "@/services/flowStateService";

export default function BannerContinueFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<FlowSession | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show on flow pages themselves
    if (location.pathname.startsWith("/entrepreneur/analysis") || 
        location.pathname === "/entrepreneur/score" ||
        location.pathname === "/entrepreneur/pricing") {
      return;
    }

    getActiveFlowSession().then(setSession);
  }, [location.pathname]);

  if (!session || dismissed) return null;

  const targetRoute = getStepRoute(session.step);
  const businessName = (session.input_payload as Record<string, string>)?.company_name || "";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground px-4 py-3"
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-medium truncate">
              {businessName
                ? `Votre analyse pour ${businessName} est prête`
                : "Votre analyse IA est en attente"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate(targetRoute)}
              className="gap-1 text-xs font-bold"
            >
              Continuer
              <ArrowRight className="w-3 h-3" />
            </Button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded hover:bg-primary-foreground/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

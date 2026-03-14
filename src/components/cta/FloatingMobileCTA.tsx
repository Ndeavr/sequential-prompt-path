/**
 * UNPRO — Floating Mobile CTA
 * Sticky bottom CTA that adapts to intent. Hidden on pages with their own CTA (dashboard, pro, etc).
 */

import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useIntentCTA } from "@/hooks/useIntentCTA";
import { ArrowRight } from "lucide-react";

const HIDDEN_PREFIXES = ["/dashboard", "/pro", "/admin", "/condo", "/alex", "/login", "/signup", "/", "/index"];

export default function FloatingMobileCTA() {
  const { pathname } = useLocation();
  const { primary, getLabel, trackClick } = useIntentCTA();

  const isHidden = HIDDEN_PREFIXES.some((p) => p === "/" || p === "/index" ? pathname === p : pathname.startsWith(p));
  const label = getLabel(primary);

  return (
    <AnimatePresence>
      {!isHidden && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-[72px] left-4 right-4 z-30 md:hidden"
        >
          <Link
            to={primary.to}
            onClick={() => trackClick(label)}
            className="flex items-center justify-center gap-2 w-full h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-xl hover:shadow-2xl transition-shadow"
          >
            {label}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

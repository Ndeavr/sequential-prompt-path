/**
 * UNPRO — Alex Navigation Orb
 * Distinctive AI copilot element in the header.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MessageCircle, Camera, Search, Phone } from "lucide-react";

const alexActions = [
  { to: "/alex", label: "Parler avec Alex", labelEn: "Talk to Alex", icon: MessageCircle },
  { to: "/alex?intent=diagnostic", label: "Diagnostiquer un problème", labelEn: "Diagnose a Problem", icon: Search },
  { to: "/alex?intent=find", label: "Trouver un entrepreneur", labelEn: "Find a Contractor", icon: Phone },
  { to: "/alex?intent=photo", label: "Analyser une photo", labelEn: "Analyze a Photo", icon: Camera },
];

export default function AlexNavOrb({ lang = "fr" }: { lang?: "fr" | "en" }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {/* Orb button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center gap-1.5 h-8 px-3 rounded-full bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border border-primary/20 hover:border-primary/40 transition-all duration-300 group"
        aria-label="Alex AI Assistant"
      >
        {/* Animated glow */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Orb icon */}
        <div className="relative z-10 flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-br from-primary via-secondary to-accent">
          <Sparkles className="h-3 w-3 text-primary-foreground" />
        </div>
        <span className="relative z-10 text-meta font-semibold text-foreground hidden sm:inline">Alex</span>
        {/* Pulse */}
        <motion.div
          className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-2 border-background"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border/40 bg-card shadow-xl p-1.5 z-50"
          >
            <div className="px-3 py-2 border-b border-border/20 mb-1">
              <p className="text-caption font-semibold text-primary flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                {lang === "en" ? "AI Copilot" : "Copilote IA"}
              </p>
            </div>
            {alexActions.map(action => (
              <Link
                key={action.to}
                to={action.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-meta text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
              >
                <action.icon className="h-3.5 w-3.5" />
                {lang === "en" && action.labelEn ? action.labelEn : action.label}
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * UNPRO — Global Alex Orb CTA
 * Floating orb that appears on all pages suggesting AIPP score check.
 * Shown only when AlexConcierge is NOT rendered (unauthenticated users).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AlexGlobalOrb = () => {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (dismissed) return null;

  return (
    <>
      {/* Orb */}
      <AnimatePresence>
        {!expanded && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ delay: 2, duration: 0.4 }}
            onClick={() => setExpanded(true)}
            className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-primary via-secondary to-accent text-primary-foreground shadow-glow-lg alex-orb flex items-center justify-center"
            aria-label="Alex IA"
          >
            <Sparkles className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded card */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-5 right-5 z-50 w-[300px] max-w-[calc(100vw-2.5rem)] rounded-3xl glass-surface shadow-xl overflow-hidden border border-border/40 p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shadow-glow shrink-0">
                  <Sparkles className="text-primary-foreground h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Alex</p>
                  <p className="text-[10px] text-muted-foreground">IA Concierge</p>
                </div>
              </div>
              <button onClick={() => setDismissed(true)} className="text-muted-foreground/50 hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Vous voulez voir votre <strong className="text-foreground">Score AIPP estimé</strong> ? Découvrez comment votre entreprise se positionne face à l'IA.
            </p>

            <Button asChild size="sm" className="w-full rounded-2xl h-10 bg-secondary hover:bg-secondary/90 text-secondary-foreground text-xs shadow-[0_0_20px_-4px_hsl(252,100%,65%,0.3)]">
              <Link to="/aipp-score">Voir mon Score AIPP <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AlexGlobalOrb;

/**
 * PanelAlexEntrepreneurTransition — Full-screen overlay where Alex
 * greets the entrepreneur and redirects to the onboarding flow.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

interface Props {
  onClose: () => void;
  sourcePage?: string;
}

const ALEX_MESSAGE = "Parfait. Je vais créer votre profil et vous montrer votre score.";

export default function PanelAlexEntrepreneurTransition({ onClose, sourcePage }: Props) {
  const navigate = useNavigate();
  const [displayedText, setDisplayedText] = useState("");
  const [redirecting, setRedirecting] = useState(false);

  // Typewriter effect
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(ALEX_MESSAGE.slice(0, i));
      if (i >= ALEX_MESSAGE.length) {
        clearInterval(interval);
        // Redirect after a short pause
        setTimeout(() => {
          setRedirecting(true);
          setTimeout(() => {
            navigate("/entrepreneurs/rejoindre", {
              state: { source: sourcePage, mode: "entrepreneur" },
            });
          }, 400);
        }, 900);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [navigate, sourcePage]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] bg-background/95 backdrop-blur-md flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          onClick={(e) => e.stopPropagation()}
          className="max-w-sm w-full space-y-6 text-center"
        >
          {/* Alex orb */}
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 2.4 }}
            className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Sparkles className="w-7 h-7 text-primary" />
          </motion.div>

          {/* Message */}
          <p className="text-lg font-medium text-foreground leading-relaxed min-h-[3.5rem]">
            {displayedText}
            <span className="animate-pulse">|</span>
          </p>

          {/* Status */}
          {redirecting && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-muted-foreground"
            >
              Redirection en cours…
            </motion.p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

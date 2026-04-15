/**
 * CardAccountPromptInline — Inline account creation prompt after first useful Alex exchange.
 * Appears naturally in the conversation flow, non-blocking.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { UserPlus, LogIn, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CardAccountPromptInlineProps {
  onContinueAsGuest?: () => void;
  showGuestOption?: boolean;
}

export default function CardAccountPromptInline({ onContinueAsGuest, showGuestOption = true }: CardAccountPromptInlineProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="max-w-sm mx-auto w-full"
    >
      <div
        className="rounded-2xl border border-primary/20 p-5 space-y-4"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.06) 0%, hsl(var(--card)) 100%)",
        }}
      >
        {/* Icon + Title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <UserPlus className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Créons votre compte gratuit
            </p>
            <p className="text-xs text-muted-foreground">
              Pour mieux vous servir et enregistrer votre demande.
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2">
          <Button asChild size="sm" className="w-full rounded-xl gap-2">
            <Link to="/role?redirect=/alex&mode=signup">
              <UserPlus className="h-3.5 w-3.5" />
              Créer mon compte gratuit
              <ArrowRight className="h-3.5 w-3.5 ml-auto" />
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="w-full rounded-xl gap-2">
            <Link to="/role?redirect=/alex&mode=login">
              <LogIn className="h-3.5 w-3.5" />
              J'ai déjà un compte
            </Link>
          </Button>

          {showGuestOption && onContinueAsGuest && (
            <button
              onClick={onContinueAsGuest}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
            >
              Continuer sans compte →
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * NoMatchConversionCard — Premium universal empty-state.
 * Replaces every "no provider available" surface with a conversion-oriented module.
 */
import { motion } from "framer-motion";
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, BellRing, MessageCircle, ShieldCheck, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  buildNoMatchTitle,
  buildNoMatchBullets,
  getNoMatchStatusCopy,
  hasSavedEstimate,
  SOCIAL_PROOF_LINE,
} from "@/lib/noMatchCopy";

type Variant = "card" | "inline" | "page";

interface Props {
  service?: string;
  city?: string;
  hasEstimate?: boolean;
  onAlex?: () => void;
  onActivateAlerts?: () => void;
  variant?: Variant;
}

export default function NoMatchConversionCard({
  service,
  city,
  hasEstimate,
  onAlex,
  onActivateAlerts,
  variant = "card",
}: Props) {
  const { user } = useAuth();
  const location = useLocation();
  const isAuthed = !!user;

  const estimateSaved = useMemo(
    () => (typeof hasEstimate === "boolean" ? hasEstimate : hasSavedEstimate()),
    [hasEstimate],
  );

  const title = useMemo(() => buildNoMatchTitle({ service, city }), [service, city]);
  const bullets = useMemo(
    () => buildNoMatchBullets({ isAuthed, hasEstimate: estimateSaved }),
    [isAuthed, estimateSaved],
  );
  const statusCopy = useMemo(() => getNoMatchStatusCopy({ hasEstimate: estimateSaved }), [estimateSaved]);

  const next = encodeURIComponent(location.pathname + location.search);
  const signupHref = `/signup?next=${next}`;
  const loginHref = `/login?next=${next}`;

  const padding = variant === "inline" ? "p-4" : "p-5 sm:p-6";
  const maxWidth = variant === "page" ? "max-w-xl" : variant === "inline" ? "max-w-[90%] ml-9" : "max-w-md";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className={`w-full ${maxWidth} rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl ${padding} shadow-[0_0_32px_hsl(var(--primary)/0.08)]`}
      aria-label="Recherche intelligente active"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="shrink-0 h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
          <Sparkles className="h-4.5 w-4.5 text-primary" aria-hidden />
        </div>
        <div className="flex-1">
          <h3 className="text-[15px] sm:text-base font-semibold text-foreground leading-snug tracking-tight">
            {title}
          </h3>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-1.5 mb-3.5">
        {estimateSaved && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success px-2.5 py-1 text-[11px] font-medium ring-1 ring-success/20">
            <Check className="h-3 w-3" /> Projet sauvegardé
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-medium ring-1 ring-primary/20 animate-pulse shadow-[0_0_18px_hsl(var(--primary)/0.35)]">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Recherche intelligente active
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted text-muted-foreground px-2.5 py-1 text-[11px] font-medium ring-1 ring-border">
          <BellRing className="h-3 w-3" /> Notification prioritaire
        </span>
      </div>

      <p className="text-xs sm:text-sm text-muted-foreground mb-3 leading-relaxed">
        {statusCopy}
      </p>

      {/* Value bullets */}
      <ul className="space-y-1.5 mb-4">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-foreground/90 leading-snug">
            <Check className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" aria-hidden />
            <span>{b.text}</span>
          </li>
        ))}
      </ul>

      {/* CTAs */}
      <div className="flex flex-col gap-2">
        {isAuthed ? (
          <Button className="w-full" onClick={onActivateAlerts}>
            <BellRing className="h-4 w-4 mr-2" /> Activer les alertes intelligentes
          </Button>
        ) : (
          <>
            <Button asChild className="w-full">
              <Link to={signupHref}>Créer mon compte UNPRO</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to={loginHref}>Se connecter</Link>
            </Button>
          </>
        )}
        {onAlex && (
          <Button variant="ghost" size="sm" className="w-full" onClick={onAlex}>
            <MessageCircle className="h-4 w-4 mr-2" /> Parler à Alex
          </Button>
        )}
      </div>

      {/* Social proof */}
      <div className="mt-4 pt-3 border-t border-border/40 flex items-start gap-2">
        <ShieldCheck className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" aria-hidden />
        <p className="text-[11px] text-muted-foreground leading-relaxed">{SOCIAL_PROOF_LINE}</p>
      </div>
    </motion.section>
  );
}

/**
 * UNPRO — Offre de repli « crédit UNPRO 350 $ ».
 *
 * Affichée UNIQUEMENT après la présentation du forfait personnalisé, et une
 * seule fois. Le montant est fixé côté serveur; aucun prix n'est transmis.
 */
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { redirectToCheckout } from "@/lib/redirectToCheckout";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import {
  FALLBACK_CREDIT_COPY,
  FALLBACK_CREDIT_EVENTS,
} from "@/lib/offers/fallbackCredit350";
import { toast } from "sonner";

interface Props {
  quoteId?: string | null;
  contractorId?: string | null;
  affiliateRef?: string | null;
  /** Appelé quand l'entrepreneur choisit « Pas maintenant ». */
  onDecline?: () => void;
  returnPath?: string;
}

export function FallbackCredit350Card({
  quoteId,
  contractorId,
  affiliateRef,
  onDecline,
  returnPath,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void logFunnelEvent({
      event_type: FALLBACK_CREDIT_EVENTS.shown,
      contractor_id: contractorId ?? null,
      metadata: { quote_id: quoteId ?? null },
    });
    // Une seule trace d'affichage par montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSecure = async () => {
    setLoading(true);
    setError(null);
    void logFunnelEvent({
      event_type: FALLBACK_CREDIT_EVENTS.clicked,
      contractor_id: contractorId ?? null,
      metadata: { quote_id: quoteId ?? null },
    });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        const next = returnPath ?? `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/auth?next=${encodeURIComponent(next)}`);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            fallbackCredit: true,
            ...(quoteId && { quoteId }),
            ...(affiliateRef && { ref: affiliateRef }),
            successUrl: `${window.location.origin}/pro/billing?credit=success`,
            cancelUrl: `${window.location.origin}${returnPath ?? window.location.pathname}?credit=canceled`,
          },
        },
      );
      if (fnError) throw fnError;
      const payload = data as { url?: string; error?: string } | null;
      if (payload?.error) throw new Error(payload.error);
      if (!payload?.url) throw new Error("url_manquante");
      redirectToCheckout(payload.url);
      setTimeout(() => setLoading(false), 2500);
    } catch (e) {
      void logFunnelEvent({
        event_type: FALLBACK_CREDIT_EVENTS.paymentFailed,
        contractor_id: contractorId ?? null,
        metadata: {
          quote_id: quoteId ?? null,
          reason: e instanceof Error ? e.message : String(e),
        },
      });
      setError("Le paiement n'a pas pu démarrer. Vous pouvez réessayer.");
      toast.error("Le paiement n'a pas pu démarrer.");
      setLoading(false);
    }
  };

  const handleDecline = () => {
    void logFunnelEvent({
      event_type: FALLBACK_CREDIT_EVENTS.declined,
      contractor_id: contractorId ?? null,
      metadata: { quote_id: quoteId ?? null },
    });
    onDecline?.();
  };

  return (
    <div className="w-full max-w-full rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 sm:p-6">
      <p className="text-sm text-readable-secondary">{FALLBACK_CREDIT_COPY.eyebrow}</p>
      <h3 className="mt-1 text-xl sm:text-2xl font-semibold text-readable tracking-tight">
        {FALLBACK_CREDIT_COPY.title}
      </h3>

      <ul className="mt-4 space-y-2">
        {FALLBACK_CREDIT_COPY.benefits.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-readable-body">
            <Check className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
            <span className="break-words">{b}</span>
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSecure}
        disabled={loading}
        className="mt-5 w-full rounded-[18px] bg-primary px-5 py-3 text-primary-foreground font-medium transition-transform duration-300 hover:-translate-y-0.5 disabled:opacity-60"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Ouverture du paiement…
          </span>
        ) : (
          FALLBACK_CREDIT_COPY.ctaPrimary
        )}
      </button>

      <button
        type="button"
        onClick={handleDecline}
        className="mt-3 w-full text-sm text-readable-muted underline-offset-4 hover:underline"
      >
        {FALLBACK_CREDIT_COPY.ctaSecondary}
      </button>

      <p className="mt-4 text-xs text-readable-muted">
        {FALLBACK_CREDIT_COPY.creditNotice}
      </p>
    </div>
  );
}

export default FallbackCredit350Card;

/**
 * AuthGateCard — premium glass card that proposes a quick sign in / sign up.
 * Used inline in the Alex conversation and as a bottom sheet before
 * engagement actions (booking, devis, save, perso recommandation…).
 *
 * Channels: Email magic link (live), SMS (coming soon).
 * Never exposes technical errors. UX-safe copy only.
 */
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, MessageSquare, ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuthGateStore, AUTH_GATE_DISMISS_KEY, type AuthGateReason } from "@/stores/authGateStore";
import { useAuth } from "@/hooks/useAuth";
import { normalizeInput } from "@/utils/normalizeInput";

const REASON_COPY: Record<AuthGateReason, { title: string; subtitle: string }> = {
  first_intent: {
    title: "Pour vous offrir une meilleure expérience",
    subtitle: "Connectez-vous en quelques secondes. On en crée un compte au besoin.",
  },
  book: {
    title: "On finalise votre rendez-vous",
    subtitle: "Une connexion rapide protège votre réservation et vos rappels.",
  },
  quote: {
    title: "On sauvegarde votre dossier de soumissions",
    subtitle: "Connectez-vous pour comparer et conserver vos analyses.",
  },
  save_project: {
    title: "Gardez votre dossier propriété",
    subtitle: "Connectez-vous pour le retrouver à tout moment.",
  },
  personalized_reco: {
    title: "Recommandation personnalisée",
    subtitle: "Connectez-vous pour recevoir un entrepreneur ciblé pour vous.",
  },
  save_lead: {
    title: "On garde vos coordonnées en sécurité",
    subtitle: "Connectez-vous pour suivre votre demande.",
  },
};

type Status = "idle" | "sending" | "sent" | "error";

export default function AuthGateCard() {
  const { isOpen, reason, variant, channel, pendingAction, close, setChannel } = useAuthGateStore();
  const { session } = useAuth() as any;
  const [identifier, setIdentifier] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [maskedSent, setMaskedSent] = useState<string | null>(null);

  const copy = useMemo(() => (reason ? REASON_COPY[reason] : null), [reason]);

  // If the user becomes authenticated while the card is open → close + replay.
  useEffect(() => {
    if (!isOpen) return;
    if (session?.user) {
      const action = pendingAction;
      close();
      try {
        if (action) setTimeout(() => action(), 250);
      } catch {}
    }
  }, [isOpen, session?.user, pendingAction, close]);

  // Reset internal state when the card closes/opens.
  useEffect(() => {
    if (isOpen) {
      setStatus("idle");
      setMaskedSent(null);
      setIdentifier("");
    }
  }, [isOpen, reason]);

  const handleSend = async () => {
    if (!identifier.trim() || status === "sending") return;

    const norm =
      channel === "email"
        ? normalizeInput(identifier, "email")
        : normalizeInput(identifier, "phone");

    if (!norm.valid) {
      setStatus("error");
      return;
    }

    setStatus("sending");
    try {
      const { data, error } = await supabase.functions.invoke("auth-otp-dispatch", {
        body: {
          channel,
          identifier: norm.value,
          returnUrl: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      const payload = (data ?? {}) as any;
      if (error || !payload?.ok) {
        // sms_unavailable → switch tab silently and message user
        if (payload?.error === "sms_unavailable") {
          setChannel("email");
          setStatus("idle");
          return;
        }
        setStatus("error");
        return;
      }
      setMaskedSent(payload.masked_identifier ?? null);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  const handleLater = () => {
    if (reason === "first_intent") {
      try {
        sessionStorage.setItem(AUTH_GATE_DISMISS_KEY, "1");
      } catch {}
    }
    close();
  };

  if (!isOpen || !copy) return null;

  const isSheet = variant === "sheet";

  const cardInner = (
    <motion.div
      key="auth-gate-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-[440px] mx-auto rounded-[24px] overflow-hidden text-white"
      style={{
        background:
          "linear-gradient(180deg, rgba(59,130,246,0.22) 0%, rgba(14,30,72,0.55) 60%, rgba(6,14,40,0.70) 100%), rgba(10,22,55,0.32)",
        backdropFilter: "blur(36px) saturate(180%)",
        WebkitBackdropFilter: "blur(36px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.18)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.12), 0 30px 80px -20px rgba(11,18,60,0.55), 0 0 60px rgba(59,130,246,0.26)",
      }}
      role="dialog"
      aria-label={copy.title}
    >
      {/* Close (sheet only) */}
      {isSheet && (
        <button
          type="button"
          onClick={handleLater}
          aria-label="Fermer"
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="px-5 pt-5 pb-1">
        <h3 className="text-[17px] font-semibold leading-snug">{copy.title}</h3>
        <p className="text-[13px] text-white/75 leading-snug mt-1">{copy.subtitle}</p>
      </div>

      {/* Channel tabs */}
      <div className="px-5 pt-4">
        <div className="flex p-1 rounded-2xl bg-white/8 border border-white/10 gap-1">
          {(["email", "sms"] as const).map((c) => {
            const active = channel === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setChannel(c);
                  setStatus("idle");
                  setMaskedSent(null);
                  setIdentifier("");
                }}
                className={`flex-1 h-9 rounded-xl text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors ${
                  active
                    ? "bg-white text-[#0B1530] shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
                    : "text-white/80 hover:text-white"
                }`}
                aria-pressed={active}
              >
                {c === "email" ? <Mail className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                {c === "email" ? "Courriel" : "SMS"}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {status === "sent" ? (
          <motion.div
            key="sent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-5 py-6 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-white/12 border border-white/15 mx-auto flex items-center justify-center mb-3">
              <Check className="w-5 h-5 text-white" />
            </div>
            <p className="text-[14px] font-semibold">Lien envoyé</p>
            <p className="text-[12.5px] text-white/75 mt-1">
              Ouvrez le courriel envoyé à <span className="font-medium text-white">{maskedSent ?? "votre adresse"}</span> pour vous connecter.
            </p>
            <button
              type="button"
              onClick={handleLater}
              className="mt-5 text-[12px] text-white/70 hover:text-white transition-colors"
            >
              Continuer pendant ce temps
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-5 pt-4 pb-5 space-y-3"
          >
            <Input
              type={channel === "email" ? "email" : "tel"}
              inputMode={channel === "email" ? "email" : "tel"}
              autoComplete={channel === "email" ? "email" : "tel"}
              placeholder={channel === "email" ? "vous@courriel.com" : "(514) 555-0000"}
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
              className="h-11 rounded-xl bg-white/95 text-[#0B1530] placeholder:text-[#0B1530]/45 border-0 focus-visible:ring-2 focus-visible:ring-[#3B82F6]/60"
              aria-label={channel === "email" ? "Adresse courriel" : "Numéro de téléphone"}
            />

            {channel === "sms" && (
              <p className="text-[11.5px] text-white/70 leading-snug">
                Le SMS arrive bientôt — utilisez le courriel pour vous connecter dès maintenant.
              </p>
            )}

            {status === "error" && (
              <p className="text-[12px] text-white/85" role="status">
                Vérifiez la valeur entrée puis réessayez.
              </p>
            )}

            <Button
              onClick={handleSend}
              disabled={status === "sending" || !identifier.trim()}
              className="w-full h-11 rounded-xl bg-[#3B82F6] hover:bg-[#3B82F6]/90 text-white text-[14px] font-semibold gap-2 disabled:opacity-60"
            >
              {status === "sending"
                ? "Envoi en cours…"
                : channel === "email"
                ? "M'envoyer le lien"
                : "M'envoyer un code"}
              <ArrowRight className="w-4 h-4" />
            </Button>

            <div className="flex items-center justify-between pt-1">
              <p className="text-[11.5px] text-white/65">
                Pas encore de compte? On le crée automatiquement.
              </p>
              <button
                type="button"
                onClick={handleLater}
                className="text-[12px] text-white/75 hover:text-white transition-colors"
              >
                Plus tard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  if (isSheet) {
    return (
      <AnimatePresence>
        <motion.div
          key="auth-gate-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center p-3"
          style={{
            background:
              "radial-gradient(120% 80% at 50% 0%, rgba(59,130,246,0.22) 0%, rgba(8,16,40,0.55) 60%, rgba(2,6,23,0.72) 100%)",
            backdropFilter: "blur(24px) saturate(160%)",
            WebkitBackdropFilter: "blur(24px) saturate(160%)",
          }}
          onClick={handleLater}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full">
            {cardInner}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Inline (used inside the Alex overlay panel — render as a floating dock
  // positioned above the page chrome but below the Alex overlay.)
  return (
    <div className="fixed left-3 right-3 bottom-[88px] z-[9997] md:left-auto md:right-6 md:bottom-6 md:w-[440px]">
      {cardInner}
    </div>
  );
}

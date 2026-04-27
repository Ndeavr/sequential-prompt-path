/**
 * UNPRO — Premium Auth Overlay v2
 * Streamlined: Google + SMS primary, magic link secondary.
 * No role selection — role detection happens post-login.
 */
import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Lock, ChevronRight, Mail, CheckCircle2, Smartphone } from "lucide-react";
import { useScrollLock } from "@/hooks/useScrollLock";
import {
  subscribeAuthOverlay,
  getAuthOverlayState,
  closeAuthOverlay,
  type PendingAction,
} from "@/hooks/useAuthOverlay";
import { saveAuthIntent } from "@/services/auth/authIntentService";
import { trackAuthEvent } from "@/services/auth/trackAuthEvent";
import OAuthButtons from "@/components/auth/OAuthButtons";
import PhoneOtpForm from "@/components/auth/PhoneOtpForm";
import LoginMagicLinkForm from "@/components/auth/LoginMagicLinkForm";
import UnproIcon from "@/components/brand/UnproIcon";

type OverlayView = "main" | "sms" | "magic";

const ACTION_LABELS: Record<string, string> = {
  access_protected: "Accéder à cette section",
  upload_photo: "Téléverser une photo",
  search_contractor: "Rechercher un professionnel",
  compare_quotes: "Comparer mes soumissions",
  passport_maison: "Ouvrir Passeport Maison",
  passport_condo: "Ouvrir Passeport Condo",
  continue_alex: "Continuer avec Alex",
  login_interstitial: "Accéder à votre espace",
};

function resolveActionLabel(pending: PendingAction | null): string | null {
  if (!pending) return null;
  return pending.label || ACTION_LABELS[pending.action ?? ""] || "Continuer votre action";
}

function readPreloginRole(): string | null {
  try { return sessionStorage.getItem("unpro_prelogin_role"); } catch { return null; }
}

export default function AuthOverlayPremium() {
  const { isOpen, pendingAction } = useSyncExternalStore(
    subscribeAuthOverlay,
    getAuthOverlayState
  );

  const [view, setView] = useState<OverlayView>("main");
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  useScrollLock(isOpen);

  // Determine context (contractor vs default) for copy
  const preloginRole = isOpen ? readPreloginRole() : null;
  const contractorContext =
    preloginRole === "contractor" ||
    preloginRole === "professional" ||
    /^\/(join|entrepreneur|pro)\b/.test(pendingAction?.returnPath ?? "");

  // Reset on open
  useEffect(() => {
    if (isOpen) setView("main");
  }, [isOpen]);

  // Save intent
  useEffect(() => {
    if (isOpen && pendingAction) {
      saveAuthIntent({
        returnPath: pendingAction.returnPath,
        action: pendingAction.action,
      });
    }
  }, [isOpen, pendingAction]);

  // Keyboard / visualViewport avoidance — keeps the card and CTA visible on mobile
  useEffect(() => {
    if (!isOpen) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setKeyboardOffset(0);
    };
  }, [isOpen]);

  // Focus trap + Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeAuthOverlay(); return; }
      if (e.key !== "Tab") return;
      const focusable = overlayRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const actionLabel = resolveActionLabel(pendingAction);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="Connexion UNPRO"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-3 sm:p-4"
          style={{ paddingBottom: keyboardOffset ? keyboardOffset + 12 : undefined }}
          onClick={(e) => { if (e.target === e.currentTarget) closeAuthOverlay(); }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background: "hsl(228 40% 4% / 0.85)",
              backdropFilter: "blur(12px) saturate(0.5)",
              WebkitBackdropFilter: "blur(12px) saturate(0.5)",
            }}
            aria-hidden="true"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md overflow-y-auto rounded-2xl"
            style={{
              background: "hsl(228 30% 11% / 0.97)",
              border: "1px solid hsl(228 20% 20% / 0.6)",
              boxShadow: "var(--shadow-2xl), 0 0 60px -10px hsl(222 100% 65% / 0.12)",
              maxHeight: keyboardOffset ? `calc(100dvh - ${keyboardOffset + 24}px)` : "90dvh",
            }}
          >
            {/* Close */}
            <button
              onClick={() => closeAuthOverlay()}
              className="absolute top-3 right-3 z-20 p-2 rounded-full transition-colors"
              style={{ color: "hsl(220 14% 55%)" }}
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="px-6 pt-7 pb-6 space-y-5">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="flex justify-center mb-2">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center" style={{ background: "hsl(222 100% 65% / 0.1)" }}>
                    <UnproIcon size={40} variant="primary" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-foreground font-display">
                  {contractorContext ? "Connexion à UNPRO" : "Trouvez le bon pro. Plus vite."}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                  {contractorContext
                    ? "Connectez-vous pour créer votre profil entrepreneur."
                    : "Connexion rapide et sécurisée. Aucun mot de passe requis."}
                </p>
              </div>

              {/* Pending action badge */}
              {actionLabel && (
                <div
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs"
                  style={{
                    background: "hsl(222 100% 65% / 0.08)",
                    border: "1px solid hsl(222 100% 65% / 0.15)",
                  }}
                >
                  <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-muted-foreground">
                    <span className="text-foreground font-medium">{actionLabel}</span>
                    {" · "}Nous reprendrons exactement là où vous étiez.
                  </span>
                </div>
              )}

              {/* Main view: Google + SMS */}
              {view === "main" && (
                <div className="space-y-3">
                  {/* Google */}
                  <OAuthButtons />

                  {/* SMS button */}
                  <button
                    type="button"
                    onClick={() => {
                      trackAuthEvent("auth_method_selected", { method: "sms" });
                      setView("sms");
                    }}
                    className="w-full h-12 flex items-center justify-center gap-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
                    style={{
                      background: "hsl(228 30% 13%)",
                      border: "1px solid hsl(228 18% 20%)",
                      color: "hsl(220 20% 93%)",
                      boxShadow: "0 2px 8px -2px hsl(228 40% 3% / 0.4)",
                    }}
                  >
                    <Smartphone className="h-4 w-4" />
                    Recevoir un code par SMS
                  </button>

                  {/* Trust microcopy */}
                  <div className="flex items-center justify-center gap-4 pt-2">
                    {["Connexion rapide", "Aucun mot de passe", "Accès sécurisé"].map((t) => (
                      <span key={t} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-primary/60" />
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Secondary: magic link */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        trackAuthEvent("magic_link_selected");
                        setView("magic");
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                    >
                      Autres options de connexion
                    </button>
                  </div>
                </div>
              )}

              {/* SMS view */}
              {view === "sms" && (
                <div className="space-y-2">
                  <PhoneOtpForm onSuccess={() => closeAuthOverlay()} />
                  <button
                    onClick={() => setView("main")}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                  >
                    ← Retour
                  </button>
                </div>
              )}

              {/* Magic link view */}
              {view === "magic" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">Recevoir un lien par courriel</span>
                  </div>
                  <LoginMagicLinkForm />
                  <button
                    onClick={() => setView("main")}
                    className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Retour
                  </button>
                </div>
              )}

              {/* Security footer */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <Lock className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  Connexion sécurisée · Restez connecté sans effort
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

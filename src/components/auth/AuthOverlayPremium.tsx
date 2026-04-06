/**
 * UNPRO — Premium Auth Overlay
 * Full-screen focus-locked overlay with glass card.
 * Blocks all background interaction. Supports login & signup modes.
 */
import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, User, Briefcase, Building2, Handshake, Mail, Smartphone, Lock, ChevronRight, Home, Award, Landmark, Globe, Factory, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollLock } from "@/hooks/useScrollLock";
import {
  subscribeAuthOverlay,
  getAuthOverlayState,
  closeAuthOverlay,
  type PendingAction,
} from "@/hooks/useAuthOverlay";
import { saveAuthIntent } from "@/services/auth/authIntentService";
import OAuthButtons from "@/components/auth/OAuthButtons";
import AuthDivider from "@/components/auth/AuthDivider";
import LoginMagicLinkForm from "@/components/auth/LoginMagicLinkForm";
import PhoneOtpForm from "@/components/auth/PhoneOtpForm";
import logo from "@/assets/unpro-robot.png";

type AuthMode = "role" | "choice" | "login" | "signup";
type SecondaryMethod = null | "email" | "phone";

const ROLES = [
  { code: "homeowner", label: "Propriétaire", desc: "Maison, condo, projet", icon: Home },
  { code: "contractor", label: "Entrepreneur", desc: "Visibilité, matchs, croissance", icon: Briefcase },
  { code: "professional", label: "Professionnel", desc: "Expertise, crédibilité, clients", icon: Award },
  { code: "condo_manager", label: "Gestionnaire de copropriétés", desc: "Immeubles, interventions, suivi", icon: Building2 },
  { code: "partner", label: "Partenaire", desc: "Services, intégration, collaboration", icon: Handshake },
  { code: "municipality", label: "Municipalité", desc: "Citoyens, orientation, terrain", icon: Landmark },
  { code: "public_org", label: "Organisation publique", desc: "Services, démarches, accompagnement", icon: Globe },
  { code: "enterprise", label: "Entreprise", desc: "Bâtiments, actifs, fournisseurs", icon: Factory },
  { code: "ambassador", label: "Ambassadeur", desc: "Références, commissions, croissance", icon: Users },
] as const;

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

export default function AuthOverlayPremium() {
  const { isOpen, pendingAction } = useSyncExternalStore(
    subscribeAuthOverlay,
    getAuthOverlayState
  );

  const [mode, setMode] = useState<AuthMode>("role");
  const [secondaryMethod, setSecondaryMethod] = useState<SecondaryMethod>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);

  useScrollLock(isOpen);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setMode("role");
      setSecondaryMethod(null);
      setSelectedRoles([]);
    }
  }, [isOpen]);

  // Save intent when overlay opens
  useEffect(() => {
    if (isOpen && pendingAction) {
      saveAuthIntent({
        returnPath: pendingAction.returnPath,
        action: pendingAction.action,
      });
    }
  }, [isOpen, pendingAction]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAuthOverlay();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = overlayRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const toggleRole = useCallback((code: string) => {
    setSelectedRoles((prev) =>
      prev.includes(code) ? prev.filter((r) => r !== code) : [...prev, code]
    );
  }, []);

  const actionLabel = resolveActionLabel(pendingAction);
  const modeTitle = mode === "login" ? "Connectez-vous à votre compte" : mode === "signup" ? "Créez votre accès gratuit" : "Connectez-vous pour continuer";
  const modeSubtitle = mode === "login"
    ? "Retrouvez votre espace UNPRO."
    : mode === "signup"
      ? "C'est gratuit. Votre progression est conservée."
      : "Votre action est prête. Connectez-vous ou créez un compte gratuit pour poursuivre avec UNPRO.";

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
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAuthOverlay();
          }}
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
            className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl"
            style={{
              background: "hsl(228 30% 11% / 0.95)",
              border: "1px solid hsl(228 20% 20% / 0.6)",
              boxShadow: "var(--shadow-2xl), 0 0 60px -10px hsl(222 100% 65% / 0.12)",
            }}
          >
            {/* Close button */}
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
                    <img src={logo} alt="UNPRO" className="h-10 w-10 object-contain" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-foreground font-display">{modeTitle}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[300px] mx-auto">
                  {modeSubtitle}
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

              {/* Choice mode: signup vs login */}
              {mode === "choice" && (
                <div className="space-y-2.5">
                  <Button
                    onClick={() => setMode("signup")}
                    className="w-full h-12 text-sm font-semibold rounded-xl gap-2"
                    style={{
                      background: "linear-gradient(135deg, hsl(222 100% 60%), hsl(222 100% 70%))",
                      color: "white",
                      boxShadow: "0 4px 14px -3px hsl(222 100% 65% / 0.4)",
                    }}
                  >
                    Créer mon compte gratuit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setMode("login")}
                    className="w-full h-11 text-sm font-medium rounded-xl"
                    style={{
                      background: "hsl(228 20% 14% / 0.6)",
                      border: "1px solid hsl(228 18% 20%)",
                      color: "hsl(220 20% 93%)",
                    }}
                  >
                    J'ai déjà un compte
                  </Button>
                </div>
              )}

              {/* Login or Signup mode */}
              {(mode === "login" || mode === "signup") && (
                <div className="space-y-4">
                  {/* Role selection (compact chips) */}
                  {mode === "signup" && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Choisissez votre ou vos rôles</p>
                      <div className="flex flex-wrap gap-2">
                        {ROLES.map((role) => {
                          const active = selectedRoles.includes(role.code);
                          const Icon = role.icon;
                          return (
                            <button
                              key={role.code}
                              onClick={() => toggleRole(role.code)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                              style={{
                                background: active ? "hsl(222 100% 65% / 0.15)" : "hsl(228 20% 14% / 0.5)",
                                border: `1px solid ${active ? "hsl(222 100% 65% / 0.4)" : "hsl(228 18% 18%)"}`,
                                color: active ? "hsl(222 100% 75%)" : "hsl(220 14% 55%)",
                              }}
                            >
                              <Icon className="h-3 w-3" />
                              {role.label}
                            </button>
                          );
                        })}
                      </div>
                      {selectedRoles.includes("partner") && (
                        <p className="text-[11px] text-muted-foreground pl-1">
                          Assureur, municipalité, ministère, banque ou autre organisation.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Divider */}
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1" style={{ background: "hsl(228 18% 18%)" }} />
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {mode === "login" ? "connexion" : "inscription"}
                    </span>
                    <div className="h-px flex-1" style={{ background: "hsl(228 18% 18%)" }} />
                  </div>

                  {/* OAuth providers */}
                  {!secondaryMethod && (
                    <div className="space-y-2">
                      <OAuthButtons />

                      <AuthDivider text="ou" />

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSecondaryMethod("email")}
                          className="flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-medium transition-colors"
                          style={{
                            background: "hsl(228 20% 14% / 0.6)",
                            border: "1px solid hsl(228 18% 18%)",
                            color: "hsl(220 20% 85%)",
                          }}
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Courriel
                        </button>
                        <button
                          onClick={() => setSecondaryMethod("phone")}
                          className="flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-medium transition-colors"
                          style={{
                            background: "hsl(228 20% 14% / 0.6)",
                            border: "1px solid hsl(228 18% 18%)",
                            color: "hsl(220 20% 85%)",
                          }}
                        >
                          <Smartphone className="h-3.5 w-3.5" />
                          Téléphone
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Email form */}
                  {secondaryMethod === "email" && (
                    <div className="space-y-2">
                      <LoginMagicLinkForm />
                      <button
                        onClick={() => setSecondaryMethod(null)}
                        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        ← Autres options
                      </button>
                    </div>
                  )}

                  {/* Phone form */}
                  {secondaryMethod === "phone" && (
                    <div className="space-y-2">
                      <PhoneOtpForm onSuccess={() => closeAuthOverlay()} />
                      <button
                        onClick={() => setSecondaryMethod(null)}
                        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        ← Autres options
                      </button>
                    </div>
                  )}

                  {/* Switch mode */}
                  <button
                    onClick={() => {
                      setMode(mode === "login" ? "signup" : "login");
                      setSecondaryMethod(null);
                    }}
                    className="w-full text-xs text-primary hover:underline transition-colors pt-1"
                  >
                    {mode === "login" ? "Pas encore de compte ? Créer un accès gratuit" : "J'ai déjà un compte"}
                  </button>
                </div>
              )}

              {/* Reassurance */}
              {mode === "signup" && (
                <p className="text-[11px] text-center text-muted-foreground leading-relaxed">
                  C'est gratuit. Votre progression est conservée et votre expérience sera personnalisée dès la prochaine étape.
                </p>
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

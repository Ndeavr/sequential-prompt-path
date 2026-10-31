/**
 * UNPRO — Login Page (Unified)
 * Google OAuth + SMS Code (primary) · Magic Link (secondary)
 * Post-login routing centralized via useAuthReturn (AuthReturnManager).
 */
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthReturn } from "@/hooks/useAuthReturn";
import AuthCardUnpro from "@/components/auth/AuthCardUnpro";
import OAuthButtons from "@/components/auth/OAuthButtons";
import PhoneOtpForm from "@/components/auth/PhoneOtpForm";
import LoginMagicLinkForm from "@/components/auth/LoginMagicLinkForm";
import { trackAuthEvent } from "@/services/auth/trackAuthEvent";
import { readRoleIntent } from "@/services/auth/roleIntent";
import { Smartphone, Mail, Lock, CheckCircle2, ArrowRight, AlertTriangle } from "lucide-react";

export default function LoginPageUnpro() {
  const [mode, setMode] = useState<"main" | "phone" | "email">("main");
  const { destination, goNow, showFallback, redirected } = useAuthReturn({ auto: true, delayMs: 350 });
  const [searchParams] = useSearchParams();
  const authError = searchParams.get("auth_error");
  const authErrorDescription = searchParams.get("auth_error_description");

  // A contractor arriving from an activation / onboarding link must never read
  // homeowner copy on the sign-in screen.
  const intent = useMemo(() => readRoleIntent(), []);
  const isContractor = intent?.role === "contractor";
  const business = isContractor ? (intent?.businessName ?? "").trim() : "";
  const title = "Bienvenue chez UNPRO";
  const subtitle = isContractor
    ? (business ? `Accédez à votre espace professionnel — ${business}` : "Accédez à votre espace professionnel")
    : "Créez votre compte ou connectez-vous.";
  const note = mode === "main" ? "Sans mot de passe." : undefined;

  return (
    <AuthCardUnpro title={title} subtitle={subtitle} note={note}>
      {authError && !redirected && (
        <div
          role="alert"
          className="mb-4 flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-semibold">La connexion n'a pas abouti.</p>
            <p className="mt-1 text-muted-foreground">
              {authErrorDescription || "Le fournisseur d'identité a refusé la demande."}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Réf. : {authError}</p>
          </div>
        </div>
      )}

      {redirected && (
        <div className="flex flex-col items-center justify-center py-6 gap-3">
          <CheckCircle2 className="h-10 w-10 text-green-400" />
          <p className="text-sm text-muted-foreground">Redirection en cours…</p>
        </div>
      )}

      {!redirected && showFallback && (
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <p className="text-sm font-medium text-foreground">Connexion réussie</p>
          </div>
          <button
            type="button"
            onClick={goNow}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground active:scale-[0.98] transition-transform"
          >
            Continuer <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-[11px] text-center text-muted-foreground">Destination : {destination}</p>
        </div>
      )}

      {!redirected && !showFallback && mode === "main" && (
        <div className="space-y-3">
          <OAuthButtons />
          <button
            type="button"
            onClick={() => {
              trackAuthEvent("auth_method_selected", { method: "sms" });
              setMode("phone");
            }}
            className="w-full h-12 flex items-center justify-center gap-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all active:scale-[0.98]"
          >
            <Smartphone className="h-4 w-4" />
            Recevoir un code par SMS
          </button>

          <button
            type="button"
            onClick={() => {
              trackAuthEvent("magic_link_selected");
              setMode("email");
            }}
            className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border border-input bg-secondary text-sm font-semibold text-foreground hover:bg-accent transition-colors"
          >
            <Mail className="h-4 w-4" />
            Continuer par courriel
          </button>
        </div>
      )}

      {!redirected && !showFallback && mode === "phone" && (
        <div className="space-y-2">
          <PhoneOtpForm onSuccess={goNow} />
          <button type="button" onClick={() => setMode("main")} className="w-full min-h-11 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground">
            ← Retour aux choix de connexion
          </button>
        </div>
      )}

      {!redirected && !showFallback && mode === "email" && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Connexion par courriel</h2>
          <p className="pb-1 text-sm text-muted-foreground">Nous vous enverrons un lien pour créer votre compte ou vous connecter.</p>
          <LoginMagicLinkForm label="Courriel" placeholder="exemple@courriel.com" ctaLabel="Recevoir mon lien" />
          <button type="button" onClick={() => setMode("main")} className="w-full min-h-11 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground">
            ← Retour aux choix de connexion
          </button>
        </div>
      )}

      <div className="flex items-center justify-center gap-1.5 pt-4">
        <Lock className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Connexion sécurisée, sans mot de passe.
        </span>
      </div>
    </AuthCardUnpro>
  );
}

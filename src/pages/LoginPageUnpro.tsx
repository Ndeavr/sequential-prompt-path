/**
 * UNPRO — Login Page (Unified)
 * Google OAuth + SMS Code (primary) · Magic Link (secondary)
 * Post-login routing centralized via useAuthReturn (AuthReturnManager).
 */
import { useState } from "react";
import { useAuthReturn } from "@/hooks/useAuthReturn";
import AuthCardUnpro from "@/components/auth/AuthCardUnpro";
import OAuthButtons from "@/components/auth/OAuthButtons";
import PhoneOtpForm from "@/components/auth/PhoneOtpForm";
import LoginMagicLinkForm from "@/components/auth/LoginMagicLinkForm";
import { trackAuthEvent } from "@/services/auth/trackAuthEvent";
import { Smartphone, Mail, Lock, CheckCircle2, ArrowRight } from "lucide-react";

export default function LoginPageUnpro() {
  const [mode, setMode] = useState<"main" | "phone" | "email">("main");
  const { destination, goNow, showFallback, redirected } = useAuthReturn({ auto: true, delayMs: 350 });

  return (
    <AuthCardUnpro title="Trouvez le bon pro. Plus vite." subtitle="Connexion rapide et sécurisée">
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

          <div className="flex items-center justify-center gap-4 pt-2">
            {["Connexion rapide", "Aucun mot de passe", "Accès sécurisé"].map((t) => (
              <span key={t} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-primary/60" />
                {t}
              </span>
            ))}
          </div>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                trackAuthEvent("magic_link_selected");
                setMode("email");
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Autres options de connexion
            </button>
          </div>
        </div>
      )}

      {!redirected && !showFallback && mode === "phone" && (
        <div className="space-y-2">
          <PhoneOtpForm onSuccess={goNow} />
          <button onClick={() => setMode("main")} className="w-full text-xs text-muted-foreground hover:text-foreground">
            ← Retour
          </button>
        </div>
      )}

      {!redirected && !showFallback && mode === "email" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Recevoir un lien par courriel</span>
          </div>
          <LoginMagicLinkForm />
          <button onClick={() => setMode("main")} className="w-full text-xs text-muted-foreground hover:text-foreground">
            ← Retour
          </button>
        </div>
      )}

      <div className="flex items-center justify-center gap-1.5 pt-4">
        <Lock className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Connexion sécurisée · Restez connecté sans effort
        </span>
      </div>
    </AuthCardUnpro>
  );
}

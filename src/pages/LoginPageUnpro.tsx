/**
 * UNPRO — Login Page (Unified)
 * Google OAuth + Magic Link + Phone OTP
 */
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { consumeAuthIntent, getDefaultRedirectForRole } from "@/services/auth/authIntentService";
import { consumeNavigationContext, getResumePath } from "@/services/navigation/journeyService";
import AuthCardUnpro from "@/components/auth/AuthCardUnpro";
import OAuthButtons from "@/components/auth/OAuthButtons";
import AuthDivider from "@/components/auth/AuthDivider";
import LoginMagicLinkForm from "@/components/auth/LoginMagicLinkForm";
import PhoneOtpForm from "@/components/auth/PhoneOtpForm";
import { Smartphone, Mail, Lock } from "lucide-react";

export default function LoginPageUnpro() {
  const [mode, setMode] = useState<"main" | "email" | "phone">("main");
  const { isAuthenticated, role, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const intent = consumeAuthIntent();
      const navCtx = consumeNavigationContext();
      const from = (location.state as any)?.from;
      const resumePath = getResumePath(role);
      const target = intent?.returnPath || navCtx?.intendedDestination || from || resumePath || getDefaultRedirectForRole(role);
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, isLoading, role, navigate, location]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Chargement…</p>
      </div>
    );
  }

  return (
    <AuthCardUnpro title="Connectez-vous" subtitle="Aucun mot de passe requis">
      {/* OAuth - primary */}
      <OAuthButtons />

      <AuthDivider text="ou" />

      {mode === "main" && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setMode("email")}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors hover:bg-muted border border-border bg-card text-foreground"
          >
            <Mail className="h-4 w-4 text-muted-foreground" />
            Continuer par courriel
          </button>
          <button
            type="button"
            onClick={() => setMode("phone")}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors hover:bg-muted border border-border bg-card text-foreground"
          >
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            Continuer par téléphone
          </button>
        </div>
      )}

      {mode === "email" && (
        <div className="space-y-2">
          <LoginMagicLinkForm />
          <button onClick={() => setMode("main")} className="w-full text-xs text-muted-foreground hover:text-foreground">
            ← Autres options
          </button>
        </div>
      )}

      {mode === "phone" && (
        <div className="space-y-2">
          <PhoneOtpForm onSuccess={() => {}} />
          <button onClick={() => setMode("main")} className="w-full text-xs text-muted-foreground hover:text-foreground">
            ← Autres options
          </button>
        </div>
      )}

      {/* Trust signal */}
      <div className="flex items-center justify-center gap-1.5 pt-4">
        <Lock className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Connexion sécurisée · Restez connecté sans effort
        </span>
      </div>
    </AuthCardUnpro>
  );
}

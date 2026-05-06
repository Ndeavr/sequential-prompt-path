/**
 * UNPRO — Login Page (Unified)
 * Google OAuth + SMS Code (primary) · Magic Link (secondary)
 */
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { consumeAuthIntent, getDefaultRedirectForRole } from "@/services/auth/authIntentService";
import { consumeNavigationContext, getResumePath } from "@/services/navigation/journeyService";
import { trackAuthEvent } from "@/services/auth/trackAuthEvent";
import AuthCardUnpro from "@/components/auth/AuthCardUnpro";
import OAuthButtons from "@/components/auth/OAuthButtons";
import PhoneOtpForm from "@/components/auth/PhoneOtpForm";
import LoginMagicLinkForm from "@/components/auth/LoginMagicLinkForm";
import { Smartphone, Mail, Lock, CheckCircle2 } from "lucide-react";

export default function LoginPageUnpro() {
  const [mode, setMode] = useState<"main" | "phone" | "email">("main");
  const { isAuthenticated, role, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const searchParams = new URLSearchParams(location.search);
      const redirectParam = searchParams.get("redirect");
      const intent = consumeAuthIntent();
      const navCtx = consumeNavigationContext();
      const from = (location.state as any)?.from;
      const resumePath = getResumePath(role);
      const target = redirectParam || intent?.returnPath || navCtx?.intendedDestination || from || resumePath || "/";
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
    <AuthCardUnpro title="Trouvez le bon pro. Plus vite." subtitle="Connexion rapide et sécurisée">
      {mode === "main" && (
        <div className="space-y-3">
          {/* Google */}
          <OAuthButtons />

          {/* SMS */}
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

          {/* Trust microcopy */}
          <div className="flex items-center justify-center gap-4 pt-2">
            {["Connexion rapide", "Aucun mot de passe", "Accès sécurisé"].map((t) => (
              <span key={t} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-primary/60" />
                {t}
              </span>
            ))}
          </div>

          {/* Secondary */}
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

      {mode === "phone" && (
        <div className="space-y-2">
          <PhoneOtpForm onSuccess={() => {}} />
          <button onClick={() => setMode("main")} className="w-full text-xs text-muted-foreground hover:text-foreground">
            ← Retour
          </button>
        </div>
      )}

      {mode === "email" && (
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

      {/* Security footer */}
      <div className="flex items-center justify-center gap-1.5 pt-4">
        <Lock className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Connexion sécurisée · Restez connecté sans effort
        </span>
      </div>
    </AuthCardUnpro>
  );
}

/**
 * UNPRO — Login Interstitial
 * Premium gate shown when a guest clicks a protected route.
 * Preserves intent and resumes after auth.
 */
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Sparkles, ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveAuthIntent } from "@/services/auth/authIntentService";

interface LoginInterstitialProps {
  title?: string;
  subtitle?: string;
  benefits?: string[];
  returnPath?: string;
}

export default function LoginInterstitialUNPRO({
  title = "Connectez-vous pour continuer",
  subtitle = "Accédez à votre espace personnel UnPRO.",
  benefits = ["Suivi en temps réel", "Recommandations IA", "Historique complet"],
  returnPath,
}: LoginInterstitialProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const target = returnPath || pathname;

  const handleLogin = () => {
    saveAuthIntent({ returnPath: target, action: "login_interstitial" });
    navigate("/login");
  };

  const handleSignup = () => {
    saveAuthIntent({ returnPath: target, action: "login_interstitial" });
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 text-center"
      >
        <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Shield className="w-8 h-8 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        {benefits.length > 0 && (
          <div className="space-y-3 text-left bg-muted/50 rounded-xl p-5">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-foreground">{b}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <Button onClick={handleLogin} className="w-full gap-2" size="lg">
            <LogIn className="w-4 h-4" />
            Se connecter
          </Button>
          <Button onClick={handleSignup} variant="outline" className="w-full gap-2" size="lg">
            Créer un compte
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <button
          onClick={() => navigate("/")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Retourner à l'accueil
        </button>
      </motion.div>
    </div>
  );
}

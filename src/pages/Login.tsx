/**
 * UNPRO — Login Page (No Password)
 * Primary: Google + Apple OAuth
 * Secondary: Phone OTP
 */
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { motion } from "framer-motion";
import OAuthButtons from "@/components/auth/OAuthButtons";
import AuthDivider from "@/components/auth/AuthDivider";
import PhoneOtpForm from "@/components/auth/PhoneOtpForm";
import { consumeAuthIntent, getDefaultRedirectForRole } from "@/services/auth/authIntentService";
import { consumeNavigationContext, getResumePath } from "@/services/navigation/journeyService";
import { Smartphone, Lock } from "lucide-react";
import UnproIcon from "@/components/brand/UnproIcon";

const Login = () => {
  const [showPhone, setShowPhone] = useState(false);
  const { isAuthenticated, role, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
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

  const handlePhoneSuccess = () => {
    // Auth state change will trigger redirect via useEffect
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "linear-gradient(180deg, #F7FBFF 0%, #EAF4FF 58%, #DCEEFF 100%)" }}>
        <p style={{ color: "#6C7A92" }}>Chargement…</p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #F7FBFF 0%, #EAF4FF 58%, #DCEEFF 100%)" }}
    >
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-[-80px] h-56 w-56 rounded-full blur-3xl" style={{ background: "hsl(210 60% 92% / 0.6)" }} />
        <div className="absolute top-36 right-[-60px] h-52 w-52 rounded-full blur-3xl" style={{ background: "hsl(222 100% 61% / 0.1)" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card style={{ background: "rgba(255,255,255,0.92)", border: "1px solid #DFE9F5", boxShadow: "0 8px 32px -6px hsl(220 40% 30% / 0.1)" }}>
          <CardHeader className="text-center pb-2 pt-8">
            <div className="flex justify-center mb-3">
              <img src={logo} alt="UNPRO" className="h-14 w-14 object-contain" />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "#0B1533" }}>
              Connectez-vous
            </h1>
            <p className="text-sm mt-1" style={{ color: "#6C7A92" }}>
              Aucun mot de passe requis
            </p>
          </CardHeader>

          <CardContent className="space-y-1 pb-8">
            {/* OAuth buttons - primary */}
            <OAuthButtons />

            <AuthDivider text="ou connectez-vous par téléphone" />

            {/* Phone OTP - secondary */}
            {showPhone ? (
              <PhoneOtpForm onSuccess={handlePhoneSuccess} />
            ) : (
              <button
                type="button"
                onClick={() => setShowPhone(true)}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors hover:bg-[hsl(220_20%_96%)]"
                style={{ border: "1px solid #DFE9F5", color: "#0B1533", background: "white" }}
              >
                <Smartphone className="h-4 w-4" style={{ color: "#6C7A92" }} />
                Continuer avec mon téléphone
              </button>
            )}

            {/* Trust signal */}
            <div className="flex items-center justify-center gap-1.5 pt-4">
              <Lock className="h-3 w-3" style={{ color: "#6C7A92" }} />
              <span className="text-xs" style={{ color: "#6C7A92" }}>
                Connexion sécurisée · Restez connecté sans effort
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;

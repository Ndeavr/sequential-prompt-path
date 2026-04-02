/**
 * UNPRO — Login Interstitial
 * Now opens the premium auth overlay instead of navigating to /login.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { openAuthOverlay } from "@/hooks/useAuthOverlay";

interface LoginInterstitialProps {
  title?: string;
  subtitle?: string;
  benefits?: string[];
  returnPath?: string;
}

export default function LoginInterstitialUNPRO({
  returnPath,
}: LoginInterstitialProps) {
  const { pathname } = useLocation();
  const target = returnPath || pathname;

  useEffect(() => {
    openAuthOverlay({
      label: "Accéder à votre espace",
      returnPath: target,
      action: "login_interstitial",
    });
  }, [target]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-muted-foreground text-sm">Connexion requise</div>
    </div>
  );
}

/**
 * UNPRO — Role Mismatch Interstitial
 * Shown when authenticated user accesses a route not matching their role.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoleMismatchProps {
  title?: string;
  subtitle?: string;
  primaryCta?: { label: string; path: string };
  secondaryCta?: { label: string; path: string };
}

export default function RoleMismatchInterstitialUNPRO({
  title = "Cette section n'est pas disponible pour votre rôle",
  subtitle = "Explorez les fonctionnalités adaptées à votre profil.",
  primaryCta = { label: "Mon tableau de bord", path: "/dashboard" },
  secondaryCta = { label: "Parler à Alex", path: "/alex" },
}: RoleMismatchProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 text-center"
      >
        <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/50 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        <div className="space-y-3">
          <Button onClick={() => navigate(primaryCta.path)} className="w-full gap-2" size="lg">
            {primaryCta.label}
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button onClick={() => navigate(secondaryCta.path)} variant="outline" className="w-full gap-2" size="lg">
            <Sparkles className="w-4 h-4" />
            {secondaryCta.label}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

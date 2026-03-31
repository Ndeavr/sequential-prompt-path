/**
 * UNPRO — Wrong Route Recovery Banner
 * Shown when a user lands on a route that doesn't match their role.
 */
import { AlertTriangle, Home, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { resolveDestinationForRole } from "@/config/routeRegistry";
import { motion } from "framer-motion";

interface Props {
  userRole: string | null;
  intendedJourney?: string;
}

const ROLE_LABELS: Record<string, string> = {
  homeowner: "espace propriétaire",
  contractor: "espace entrepreneur",
  admin: "tableau de bord admin",
  condo_manager: "espace condo",
};

export default function BannerWrongRouteRecovery({ userRole, intendedJourney }: Props) {
  const navigate = useNavigate();
  const destination = resolveDestinationForRole(userRole);
  const label = userRole ? ROLE_LABELS[userRole] || "votre espace" : "l'accueil";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-3 rounded-2xl border border-destructive/20 bg-destructive/5 backdrop-blur-xl p-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            Cette page ne correspond pas à votre espace
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Vous allez être redirigé vers {label}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card/50 px-3 py-2 text-xs font-medium text-foreground hover:bg-card transition-colors"
            >
              <Home className="h-3 w-3" />
              Accueil
            </button>
            <button
              onClick={() => navigate(destination)}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Aller à mon espace
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

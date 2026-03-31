/**
 * UNPRO — Broken Route Recovery Page
 * Shown when user hits an invalid or mismatched route.
 * Offers: resume journey, go to correct space, return home.
 */
import { Home, ArrowRight, RotateCcw, Compass } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { resolveDestinationForRole } from "@/config/routeRegistry";
import { getLatestSnapshot } from "@/services/navigation/journeyService";
import { motion } from "framer-motion";

export default function PageBrokenRouteRecovery() {
  const navigate = useNavigate();
  const { role, isAuthenticated } = useAuth();
  const snapshot = getLatestSnapshot();
  const destination = resolveDestinationForRole(role);

  const actions = [
    ...(snapshot ? [{
      icon: RotateCcw,
      label: "Reprendre mon parcours",
      sublabel: "Retourner là où j'étais rendu",
      onClick: () => navigate(snapshot.routePath),
      primary: true,
    }] : []),
    ...(isAuthenticated ? [{
      icon: Compass,
      label: "Aller à mon espace",
      sublabel: role === "contractor" ? "Tableau de bord entrepreneur" : role === "admin" ? "Administration" : "Tableau de bord",
      onClick: () => navigate(destination),
      primary: !snapshot,
    }] : []),
    {
      icon: Home,
      label: "Retour à l'accueil",
      sublabel: "Page principale UNPRO",
      onClick: () => navigate("/"),
      primary: !isAuthenticated && !snapshot,
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6 text-center"
      >
        {/* Icon */}
        <motion.div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Compass className="h-8 w-8 text-primary" />
        </motion.div>

        <div>
          <h1 className="text-xl font-bold text-foreground">
            Cette page n'est pas disponible
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            La page que vous cherchez n'existe pas ou ne correspond pas à votre espace. 
            Choisissez une option pour continuer.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {actions.map((action, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={action.onClick}
              className={`w-full flex items-center gap-4 rounded-2xl p-4 text-left transition-all ${
                action.primary
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-border bg-card/50 backdrop-blur-xl hover:bg-card text-foreground"
              }`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                action.primary ? "bg-primary-foreground/10" : "bg-primary/10"
              }`}>
                <action.icon className={`h-5 w-5 ${action.primary ? "text-primary-foreground" : "text-primary"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{action.label}</p>
                <p className={`text-xs mt-0.5 ${action.primary ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {action.sublabel}
                </p>
              </div>
              <ArrowRight className={`h-4 w-4 shrink-0 ${action.primary ? "text-primary-foreground/60" : "text-muted-foreground"}`} />
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

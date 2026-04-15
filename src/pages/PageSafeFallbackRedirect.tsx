/**
 * UNPRO — Safe Fallback Redirect Page
 * Replaces generic 404/401 with a premium, context-aware recovery experience.
 * Never shows jargon, never dead-ends.
 */
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Home, ArrowRight, Compass, MessageCircle, Search, Shield, Wrench } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { resolveRouteIntent, detectIntentFromPath } from "@/services/navigation/routeIntentResolver";
import { logBrokenLinkEvent } from "@/services/navigation/brokenLinkLogger";
import { resolveDestinationForRole } from "@/config/routeRegistry";

const intentConfig: Record<string, { title: string; subtitle: string; icon: typeof Compass; ctaLabel: string; ctaPath: string }> = {
  problem_detection: {
    title: "Besoin d'aide avec un problème?",
    subtitle: "Alex peut vous aider à identifier et résoudre votre problème résidentiel.",
    icon: Wrench,
    ctaLabel: "Détecter un problème",
    ctaPath: "/alex",
  },
  contractor_onboarding: {
    title: "Rejoignez UNPRO en tant qu'entrepreneur",
    subtitle: "Activez votre profil et commencez à recevoir des rendez-vous qualifiés.",
    icon: Shield,
    ctaLabel: "Commencer l'activation",
    ctaPath: "/entrepreneur/onboarding-voice",
  },
  services: {
    title: "Explorez nos services",
    subtitle: "Trouvez le bon professionnel pour chaque besoin résidentiel.",
    icon: Search,
    ctaLabel: "Voir les services",
    ctaPath: "/services",
  },
  alex: {
    title: "Parlez à Alex",
    subtitle: "Votre assistant intelligent pour tous vos besoins résidentiels.",
    icon: MessageCircle,
    ctaLabel: "Ouvrir Alex",
    ctaPath: "/alex",
  },
  generic: {
    title: "Page non disponible",
    subtitle: "La page que vous cherchez n'est pas accessible. Voici comment continuer.",
    icon: Compass,
    ctaLabel: "Retour à l'accueil",
    ctaPath: "/",
  },
};

export default function PageSafeFallbackRedirect() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { role, isAuthenticated } = useAuth();

  const resolution = useMemo(
    () => resolveRouteIntent(pathname, role, isAuthenticated),
    [pathname, role, isAuthenticated]
  );

  const intent = detectIntentFromPath(pathname);
  const config = intentConfig[intent] || intentConfig.generic;
  const Icon = config.icon;

  const dashboardPath = isAuthenticated ? resolveDestinationForRole(role) : null;

  // Log the broken link event
  useEffect(() => {
    logBrokenLinkEvent({
      attemptedPath: pathname,
      resolvedPath: resolution.targetPath,
      userRole: role || "guest",
      resolutionType: resolution.resolutionType,
    });
  }, [pathname, resolution, role]);

  const actions = [
    {
      icon: Icon,
      label: config.ctaLabel,
      sublabel: config.subtitle,
      onClick: () => navigate(config.ctaPath),
      primary: true,
    },
    ...(dashboardPath
      ? [
          {
            icon: Compass,
            label: "Mon espace",
            sublabel: role === "contractor" ? "Tableau de bord entrepreneur" : role === "admin" ? "Administration" : "Mon tableau de bord",
            onClick: () => navigate(dashboardPath),
            primary: false,
          },
        ]
      : []),
    {
      icon: MessageCircle,
      label: "Parler à Alex",
      sublabel: "Assistant intelligent UNPRO",
      onClick: () => navigate("/alex"),
      primary: false,
    },
    {
      icon: Home,
      label: "Accueil UNPRO",
      sublabel: "Retour à la page principale",
      onClick: () => navigate("/"),
      primary: false,
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6 text-center"
      >
        {/* Animated icon */}
        <motion.div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Icon className="h-8 w-8 text-primary" />
        </motion.div>

        <div>
          <h1 className="text-xl font-bold text-foreground">{config.title}</h1>
          <p className="text-sm text-muted-foreground mt-2">{config.subtitle}</p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {actions.map((action, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={action.onClick}
              className={`w-full flex items-center gap-4 rounded-2xl p-4 text-left transition-all ${
                action.primary
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-border bg-card/50 backdrop-blur-xl hover:bg-card text-foreground"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  action.primary ? "bg-primary-foreground/10" : "bg-primary/10"
                }`}
              >
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

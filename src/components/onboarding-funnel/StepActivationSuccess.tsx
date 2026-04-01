/**
 * StepActivationSuccess — Post-payment activation confirmation.
 */
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, BarChart3, User, Calendar, MessageCircle } from "lucide-react";

interface Props {
  businessName: string;
  planName: string;
  score?: number;
}

const NEXT_STEPS = [
  { icon: User, label: "Voir mon profil", route: "/pro/profile", delay: 0 },
  { icon: BarChart3, label: "Mon cockpit", route: "/pro", delay: 0.1 },
  { icon: Calendar, label: "Mes rendez-vous", route: "/pro/appointments", delay: 0.2 },
  { icon: MessageCircle, label: "Parler à Alex", route: "/alex", delay: 0.3 },
];

export default function StepActivationSuccess({ businessName, planName, score }: Props) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 py-4">
      {/* Success badge */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4"
        >
          <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
        </motion.div>
        <h2 className="text-2xl font-bold text-foreground">Bienvenue, {businessName} !</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Plan <span className="font-bold text-primary capitalize">{planName}</span> activé avec succès
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-card border border-border/40 p-4 text-center">
          <p className="text-xs text-muted-foreground">Plan actif</p>
          <p className="text-lg font-bold text-primary capitalize">{planName}</p>
        </div>
        {score && (
          <div className="rounded-xl bg-card border border-border/40 p-4 text-center">
            <p className="text-xs text-muted-foreground">Score importé</p>
            <p className="text-lg font-bold text-foreground">{score}/100</p>
          </div>
        )}
      </div>

      {/* Next steps */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Prochaines étapes</p>
        {NEXT_STEPS.map(({ icon: Icon, label, route, delay }) => (
          <motion.button
            key={route}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: delay + 0.3 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate(route)}
            className="w-full flex items-center gap-3 rounded-xl border border-border/40 bg-card p-4 hover:border-primary/30 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground flex-1 text-left">{label}</span>
            <span className="text-muted-foreground">→</span>
          </motion.button>
        ))}
      </div>

      {/* Alex */}
      <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
        <p className="text-xs font-semibold text-primary mb-1">Alex</p>
        <p className="text-sm text-foreground">
          🎉 Félicitations ! Votre profil est en cours d'optimisation. Vous allez commencer à recevoir des rendez-vous qualifiés très bientôt.
        </p>
      </div>
    </div>
  );
}

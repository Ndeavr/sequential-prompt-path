import { motion } from "framer-motion";
import { TrendingUp, Target, Bell, CheckCircle2, ArrowRight, Sparkles, Users, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import ScoreRing from "@/components/ui/score-ring";

const PageEntrepreneurDashboardLite = () => {
  const navigate = useNavigate();
  const score = Number(sessionStorage.getItem("unpro_lead_score") || 42);
  const businessName = sessionStorage.getItem("unpro_lead_name") || "Mon Entreprise";

  const actions = [
    { label: "Compléter mon profil", done: false, impact: "+12 pts" },
    { label: "Ajouter mes certifications", done: false, impact: "+8 pts" },
    { label: "Connecter mes avis Google", done: false, impact: "+10 pts" },
    { label: "Ajouter des photos de projets", done: false, impact: "+6 pts" },
  ];

  const stats = [
    { icon: Users, label: "Leads disponibles", value: "—", color: "text-primary" },
    { icon: BarChart3, label: "Rendez-vous ce mois", value: "—", color: "text-success" },
    { icon: Target, label: "Taux de conversion", value: "—", color: "text-accent" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-sm text-muted-foreground mb-1">Bienvenue</p>
          <h1 className="text-2xl font-bold text-foreground">{businessName}</h1>
        </motion.div>

        {/* Score + Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl p-6 border border-border shadow-sm flex flex-col items-center md:col-span-1"
          >
            <ScoreRing score={score} size={100} strokeWidth={8} label="AIPP" />
            <p className="text-xs text-muted-foreground mt-2">Score actuel</p>
          </motion.div>

          <div className="md:col-span-2 grid grid-cols-3 gap-3">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="bg-card rounded-xl p-4 border border-border text-center"
              >
                <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-2`} />
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Actions to boost score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-6 border border-border shadow-sm mb-6"
        >
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Actions recommandées
          </h2>

          <div className="space-y-3">
            {actions.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  {a.done ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                  )}
                  <span className="text-sm text-foreground">{a.label}</span>
                </div>
                <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">{a.impact}</span>
              </div>
            ))}
          </div>

          <Button className="w-full mt-4 gap-2" onClick={() => navigate("/business-import")}>
            Compléter mon profil
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>

        {/* Notifications placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-6 border border-border shadow-sm mb-6"
        >
          <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Bell className="w-5 h-5 text-accent" />
            Notifications
          </h2>
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucune notification pour le moment.</p>
            <p className="text-xs text-muted-foreground">Complétez votre profil pour recevoir vos premiers projets.</p>
          </div>
        </motion.div>

        {/* Upgrade CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground text-center"
        >
          <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-90" />
          <h3 className="font-bold text-lg mb-1">Augmentez votre visibilité</h3>
          <p className="text-sm opacity-90 mb-4">Passez au plan Pro pour recevoir jusqu'à 3x plus de rendez-vous.</p>
          <Button
            variant="secondary"
            onClick={() => navigate("/entrepreneur/pricing")}
            className="font-bold gap-2"
          >
            Voir les plans
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default PageEntrepreneurDashboardLite;

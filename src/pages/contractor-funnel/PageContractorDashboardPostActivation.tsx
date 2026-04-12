/**
 * UNPRO — PageContractorDashboardPostActivation
 * Score, completeness, tasks, upgrade prompts post-activation.
 */
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Eye, Calendar, CheckCircle2, ArrowRight, Zap, Star, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import CardGlass from "@/components/unpro/CardGlass";
import SectionContainer from "@/components/unpro/SectionContainer";
import UnproLogo from "@/components/brand/UnproLogo";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { useContractorFunnel } from "@/hooks/useContractorFunnel";

const STATS = [
  { icon: BarChart3, label: "Score AIPP", value: "87", suffix: "/100", color: "text-primary" },
  { icon: Eye, label: "Vues profil", value: "—", suffix: "", color: "text-accent" },
  { icon: Calendar, label: "RDV ce mois", value: "0", suffix: "", color: "text-success" },
  { icon: TrendingUp, label: "Visibilité", value: "+65%", suffix: "", color: "text-secondary" },
];

const TASKS = [
  { label: "Ajouter 3 photos de projets", priority: "high", done: false },
  { label: "Compléter la section FAQ", priority: "medium", done: true },
  { label: "Vérifier les zones desservies", priority: "low", done: true },
  { label: "Ajouter une description détaillée", priority: "medium", done: false },
  { label: "Connecter Google Business", priority: "high", done: false },
];

export default function PageContractorDashboardPostActivation() {
  const { state } = useContractorFunnel();

  return (
    <>
      <Helmet>
        <title>Dashboard — {state.businessName || "UNPRO"}</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UnproLogo size={100} variant="primary" animated={false} showWordmark={false} />
              <span className="text-sm font-medium text-foreground">
                {state.businessName || "Dashboard Pro"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                Actif
              </div>
            </div>
          </div>
        </div>

        <SectionContainer width="default">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
            {/* Welcome */}
            <motion.div variants={fadeUp}>
              <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground mb-1">
                Bienvenue, {state.businessName || "Entrepreneur"} 👋
              </h1>
              <p className="text-sm text-muted-foreground">
                Votre profil AIPP est actif. Voici votre tableau de bord.
              </p>
            </motion.div>

            {/* Stats grid */}
            <motion.div
              variants={staggerContainer}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            >
              {STATS.map((stat) => (
                <motion.div key={stat.label} variants={fadeUp}>
                  <CardGlass noAnimation hoverable className="text-center">
                    <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color}`} />
                    <p className="text-2xl font-bold font-display text-foreground">
                      {stat.value}
                      <span className="text-xs text-muted-foreground">{stat.suffix}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </CardGlass>
                </motion.div>
              ))}
            </motion.div>

            {/* Tasks */}
            <motion.div variants={fadeUp}>
              <CardGlass noAnimation>
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Actions prioritaires
                </h3>
                <div className="space-y-2">
                  {TASKS.map((task, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        task.done ? "bg-success/5" : "bg-muted/30"
                      }`}
                    >
                      <CheckCircle2
                        className={`h-4 w-4 ${task.done ? "text-success" : "text-muted-foreground"}`}
                      />
                      <span
                        className={`text-xs flex-1 ${
                          task.done ? "text-muted-foreground line-through" : "text-foreground"
                        }`}
                      >
                        {task.label}
                      </span>
                      {!task.done && (
                        <div
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            task.priority === "high"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/10 text-warning"
                          }`}
                        >
                          {task.priority === "high" ? "Important" : "Moyen"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardGlass>
            </motion.div>

            {/* Upgrade prompt */}
            <motion.div variants={fadeUp}>
              <CardGlass noAnimation elevated className="text-center">
                <Star className="h-6 w-6 text-warning mx-auto mb-3" />
                <h3 className="text-sm font-bold text-foreground mb-1">
                  Boostez votre visibilité
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Passez au plan Premium pour 2x plus de rendez-vous et la priorité dans les résultats.
                </p>
                <Button variant="outline" size="sm" className="rounded-xl">
                  Voir les plans
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </CardGlass>
            </motion.div>
          </motion.div>
        </SectionContainer>
      </div>
    </>
  );
}

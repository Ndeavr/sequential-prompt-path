/**
 * UNPRO Condos — Main Dashboard
 */
import { Link } from "react-router-dom";
import CondoLayout from "@/layouts/CondoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Building2, Shield, CheckCircle2, AlertTriangle, Wrench,
  PiggyBank, FileText, Calendar, ArrowRight, TrendingUp,
  Clock, BarChart3, Zap
} from "lucide-react";
import { useSyndicates } from "@/hooks/useSyndicate";
import { LoadingState, EmptyState } from "@/components/shared";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4 } }),
};

/* Mock data for demo — will be replaced with real queries */
const mockLoi16Checklist = [
  { label: "Étude du fonds de prévoyance", done: true },
  { label: "Carnet d'entretien", done: true },
  { label: "Plan de gestion de l'actif", done: false },
  { label: "Registre de copropriété", done: true },
  { label: "Attestation du syndicat", done: false },
];

const mockUpcoming = [
  { title: "Inspection toiture", date: "15 avril 2026", priority: "high" },
  { title: "Nettoyage gouttières", date: "1 mai 2026", priority: "medium" },
  { title: "Vérification extincteurs", date: "15 juin 2026", priority: "low" },
];

const CondoDashboardPage = () => {
  const { data: syndicates, isLoading } = useSyndicates();

  if (isLoading) return <CondoLayout><LoadingState /></CondoLayout>;

  if (!syndicates?.length) {
    return (
      <CondoLayout>
        <EmptyState
          icon={<Building2 className="h-10 w-10 text-primary/40" />}
          message="Aucun immeuble enregistré. Créez votre premier Passeport Immeuble pour commencer."
          action={
            <Button asChild className="rounded-xl">
              <Link to="/condos/onboarding"><Building2 className="h-4 w-4 mr-2" /> Créer mon Passeport</Link>
            </Button>
          }
        />
      </CondoLayout>
    );
  }

  const building = syndicates[0];
  const loi16Progress = Math.round((mockLoi16Checklist.filter(c => c.done).length / mockLoi16Checklist.length) * 100);

  return (
    <CondoLayout>
      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
        {/* Header */}
        <motion.div variants={fadeUp} custom={0} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold">{building.name || "Mon immeuble"}</h1>
            <p className="text-sm text-muted-foreground">{building.address}, {building.city}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Passeport actif
            </Badge>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {building.unit_count || "—"} unités
            </Badge>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUp} custom={1} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Score de santé", value: "72/100", icon: BarChart3, color: "text-warning" },
            { label: "Composantes", value: "12", icon: Wrench, color: "text-primary" },
            { label: "Fonds de prévoyance", value: "385 000 $", icon: PiggyBank, color: "text-success" },
            { label: "Documents", value: "24", icon: FileText, color: "text-secondary" },
          ].map((s, i) => (
            <Card key={i} className="border-border/40 bg-card/80">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                  <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                </div>
                <p className="font-display font-bold text-lg">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Loi 16 Checklist */}
          <motion.div variants={fadeUp} custom={2} className="lg:col-span-2">
            <Card className="border-border/40 bg-card/80">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-warning" /> Conformité Loi 16
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">{loi16Progress}%</Badge>
                </div>
                <Progress value={loi16Progress} className="h-2 mt-2" />
              </CardHeader>
              <CardContent className="space-y-2">
                {mockLoi16Checklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span className={`text-sm ${item.done ? "" : "text-muted-foreground"}`}>{item.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Upcoming Maintenance */}
          <motion.div variants={fadeUp} custom={3}>
            <Card className="border-border/40 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Entretien à venir
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {mockUpcoming.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                    <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      item.priority === "high" ? "bg-destructive" : item.priority === "medium" ? "bg-warning" : "bg-success"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.date}</p>
                    </div>
                  </div>
                ))}
                <Button asChild variant="ghost" size="sm" className="w-full mt-1">
                  <Link to="/condos/maintenance">Voir tout <ArrowRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Premium upsell */}
        <motion.div variants={fadeUp} custom={4} className="mt-6">
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 overflow-hidden">
            <CardContent className="p-5 flex flex-col sm:flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-display font-semibold text-sm mb-0.5">Passez au Premium</h3>
                <p className="text-xs text-muted-foreground">Score de santé, prévisions IA, projections fonds de prévoyance et analyse de soumissions.</p>
              </div>
              <Button asChild size="sm" className="rounded-xl shadow-glow flex-shrink-0">
                <Link to="/condos/billing">Voir les plans <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </CondoLayout>
  );
};

export default CondoDashboardPage;

/**
 * UNPRO Condos — Main Dashboard (wired to Supabase)
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
  PiggyBank, FileText, Calendar, ArrowRight, BarChart3,
  Zap, Users, Bell, Receipt
} from "lucide-react";
import { useSyndicates } from "@/hooks/useSyndicate";
import { useCondoDashboardSummary } from "@/hooks/useCondoData";
import { LoadingState, EmptyState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.4 } }),
};

const loi16Items = [
  { label: "Étude du fonds de prévoyance", key: "fonds" },
  { label: "Carnet d'entretien", key: "carnet" },
  { label: "Plan de gestion de l'actif", key: "plan_actif" },
  { label: "Registre de copropriété", key: "registre" },
  { label: "Attestation du syndicat", key: "attestation" },
];

function formatCents(cents: number): string {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", minimumFractionDigits: 0 }).format(cents / 100);
}

function priorityColor(p?: string) {
  if (p === "high" || p === "urgent") return "bg-destructive";
  if (p === "medium") return "bg-warning";
  return "bg-success";
}

const CondoDashboardPage = () => {
  const { data: syndicates, isLoading } = useSyndicates();
  const building = syndicates?.[0];
  const { data: summary, isLoading: summaryLoading } = useCondoDashboardSummary(building?.id);

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

  const loi16Progress = 60; // Will be dynamic when compliance_checks are populated

  return (
    <CondoLayout>
      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
        {/* Header */}
        <motion.div variants={fadeUp} custom={0} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold">{building.name || "Mon immeuble"}</h1>
            <p className="text-sm text-muted-foreground">{building.address}{building.city ? `, ${building.city}` : ""}</p>
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
            { label: "Composantes", value: summaryLoading ? null : String(summary?.componentCount ?? 0), icon: Wrench, color: "text-primary" },
            { label: "Documents", value: summaryLoading ? null : String(summary?.documentCount ?? 0), icon: FileText, color: "text-secondary" },
            { label: "Membres actifs", value: summaryLoading ? null : String(summary?.memberCount ?? 0), icon: Users, color: "text-success" },
            { label: "Alertes", value: summaryLoading ? null : String(summary?.alerts?.length ?? 0), icon: Bell, color: "text-warning" },
          ].map((s, i) => (
            <Card key={i} className="border-border/40 bg-card/80">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                  <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                </div>
                {s.value !== null ? (
                  <p className="font-display font-bold text-lg">{s.value}</p>
                ) : (
                  <Skeleton className="h-6 w-12" />
                )}
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
                {loi16Items.map((item, i) => {
                  const done = i < 3; // Will be dynamic
                  return (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                      )}
                      <span className={`text-sm ${done ? "" : "text-muted-foreground"}`}>{item.label}</span>
                    </div>
                  );
                })}
                <Button asChild variant="ghost" size="sm" className="w-full mt-1">
                  <Link to="/condos/loi-16">Voir le détail complet <ArrowRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Upcoming Maintenance — real data */}
          <motion.div variants={fadeUp} custom={3}>
            <Card className="border-border/40 bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Entretien à venir
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summaryLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
                ) : summary?.upcomingTasks?.length ? (
                  summary.upcomingTasks.map((task: any) => (
                    <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${priorityColor(task.priority)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title || task.description || "Tâche"}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.due_date ? new Date(task.due_date).toLocaleDateString("fr-CA") : "—"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucune tâche à venir</p>
                )}
                <Button asChild variant="ghost" size="sm" className="w-full mt-1">
                  <Link to="/condos/maintenance">Voir tout <ArrowRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Alerts */}
        {summary?.alerts?.length ? (
          <motion.div variants={fadeUp} custom={4} className="mt-4">
            <Card className="border-warning/20 bg-warning/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" /> Alertes actives
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.alerts.slice(0, 3).map((alert: any) => (
                  <div key={alert.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-background/50">
                    <div className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${
                      alert.severity === "critical" ? "bg-destructive" : alert.severity === "high" ? "bg-warning" : "bg-primary"
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      {alert.message && <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        ) : null}

        {/* Pending Invoices */}
        {summary?.pendingInvoices?.length ? (
          <motion.div variants={fadeUp} custom={5} className="mt-4">
            <Card className="border-border/40 bg-card/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" /> Factures en attente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.pendingInvoices.slice(0, 3).map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{inv.supplier_name}</p>
                      <p className="text-xs text-muted-foreground">{inv.description || "—"}</p>
                    </div>
                    <span className="text-sm font-semibold">{formatCents(inv.total_cents || inv.amount_cents)}</span>
                  </div>
                ))}
                <Button asChild variant="ghost" size="sm" className="w-full">
                  <Link to="/condos/financials">Voir toutes les factures <ArrowRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : null}

        {/* Premium upsell */}
        <motion.div variants={fadeUp} custom={6} className="mt-6">
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

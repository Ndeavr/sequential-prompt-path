import { useParams } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useReserveFundSnapshots, useCapexForecasts } from "@/hooks/useSyndicate";
import { motion } from "framer-motion";
import { Wallet, TrendingUp, AlertTriangle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const SyndicateReserveFund = () => {
  const { id } = useParams<{ id: string }>();
  const { data: snapshots, isLoading: sLoading } = useReserveFundSnapshots(id);
  const { data: forecasts, isLoading: fLoading } = useCapexForecasts(id);

  if (sLoading || fLoading) return <DashboardLayout><LoadingState /></DashboardLayout>;

  const latest = snapshots?.[0];
  const fundingRatio = latest ? (latest.funding_ratio ?? 0) * 100 : 0;
  const totalCapex = (forecasts ?? []).reduce((s: number, f: any) => s + (f.estimated_cost ?? 0), 0);

  return (
    <DashboardLayout>
      <PageHeader title="Fonds de prévoyance" description="Analyse de la capitalisation du syndicat" />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Solde actuel</p>
                  <p className="text-xl font-bold text-foreground">
                    {latest ? `${Number(latest.balance).toLocaleString("fr-CA")} $` : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ratio de capitalisation</p>
                  <p className="text-xl font-bold text-foreground">{fundingRatio.toFixed(0)}%</p>
                </div>
              </div>
              <Progress value={Math.min(fundingRatio, 100)} className="mt-3 h-2" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CapEx total prévu</p>
                  <p className="text-xl font-bold text-foreground">
                    {totalCapex.toLocaleString("fr-CA")} $
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Historical snapshots */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Historique du fonds</CardTitle>
        </CardHeader>
        <CardContent>
          {!snapshots?.length ? (
            <EmptyState icon={<Wallet className="h-8 w-8 text-muted-foreground/40" />} title="Aucun relevé" description="Ajoutez un premier relevé du fonds de prévoyance." />
          ) : (
            <div className="space-y-3">
              {snapshots.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-muted/20 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(s.snapshot_date), "d MMMM yyyy", { locale: fr })}
                    </p>
                    {s.notes && <p className="text-xs text-muted-foreground mt-0.5">{s.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{Number(s.balance).toLocaleString("fr-CA")} $</p>
                    <p className="text-xs text-muted-foreground">Contrib: {Number(s.annual_contribution).toLocaleString("fr-CA")} $/an</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CapEx forecasts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Prévisions de dépenses en capital
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!forecasts?.length ? (
            <EmptyState icon={<Calendar className="h-8 w-8 text-muted-foreground/40" />} title="Aucune prévision" description="Ajoutez des composantes à remplacer." />
          ) : (
            <div className="space-y-2">
              {forecasts.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30">
                  <div>
                    <p className="text-sm font-medium">{f.component}</p>
                    <p className="text-xs text-muted-foreground">{f.description}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={f.replacement_priority === "high" ? "destructive" : "secondary"} className="text-xs">
                      {f.forecast_year}
                    </Badge>
                    <p className="text-sm font-semibold mt-1">{Number(f.estimated_cost).toLocaleString("fr-CA")} $</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default SyndicateReserveFund;

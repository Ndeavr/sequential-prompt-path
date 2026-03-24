import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader, LoadingState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Brain, TrendingUp, AlertTriangle, Target, DollarSign, Clock, BarChart3, Zap } from "lucide-react";
import { motion } from "framer-motion";

const qualityBadge = (score: number) => {
  if (score >= 75) return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Excellent</Badge>;
  if (score >= 55) return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Bon</Badge>;
  if (score >= 35) return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Moyen</Badge>;
  return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Faible</Badge>;
};

const riskBadge = (level: string) => {
  const map: Record<string, string> = {
    low: "bg-green-500/10 text-green-600 border-green-500/20",
    medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    high: "bg-red-500/10 text-red-600 border-red-500/20",
  };
  return <Badge className={map[level] || map.medium}>{level === "low" ? "Faible" : level === "medium" ? "Moyen" : "Élevé"}</Badge>;
};

const formatCurrency = (v: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

const usePredictiveLeads = () =>
  useQuery({
    queryKey: ["admin-predictive-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_leads")
        .select("*, market_lead_predictions(*), market_lead_risk_scores(*), market_next_best_actions(*)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

const usePredictiveStats = () =>
  useQuery({
    queryKey: ["admin-predictive-stats"],
    queryFn: async () => {
      const { data: predictions } = await supabase
        .from("market_lead_predictions")
        .select("predicted_lead_quality_score, predicted_contract_value, predicted_close_probability, confidence_score");
      const all = predictions ?? [];
      const total = all.length;
      const avgQuality = total ? Math.round(all.reduce((s, p) => s + (p.predicted_lead_quality_score || 0), 0) / total) : 0;
      const avgValue = total ? Math.round(all.reduce((s, p) => s + (p.predicted_contract_value || 0), 0) / total) : 0;
      const avgClose = total ? Math.round(all.reduce((s, p) => s + (p.predicted_close_probability || 0), 0) / total * 100) : 0;
      const avgConfidence = total ? Math.round(all.reduce((s, p) => s + (p.confidence_score || 0), 0) / total * 100) : 0;
      const highQuality = all.filter(p => (p.predicted_lead_quality_score || 0) >= 70).length;

      return { total, avgQuality, avgValue, avgClose, avgConfidence, highQuality };
    },
  });

const StatCard = ({ title, value, icon, subtitle }: { title: string; value: string | number; icon: React.ReactNode; subtitle?: string }) => (
  <Card className="border-border/40 bg-card/60 backdrop-blur-sm">
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-muted-foreground text-xs font-medium">{title}</span>
        <div className="text-muted-foreground/50">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </CardContent>
  </Card>
);

const AdminPredictiveLeads = () => {
  const { data: leads, isLoading, error } = usePredictiveLeads();
  const { data: stats } = usePredictiveStats();

  return (
    <AdminLayout>
      <PageHeader title="Predictive Lead Core" description="Prédiction rule-based des leads — valeur, probabilité, risque, prochaine action" />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard title="Total leads" value={stats?.total ?? 0} icon={<Brain className="h-4 w-4" />} />
        <StatCard title="Qualité moyenne" value={`${stats?.avgQuality ?? 0}/100`} icon={<Target className="h-4 w-4" />} />
        <StatCard title="Haute qualité" value={stats?.highQuality ?? 0} icon={<Zap className="h-4 w-4" />} />
        <StatCard title="Valeur moyenne" value={formatCurrency(stats?.avgValue ?? 0)} icon={<DollarSign className="h-4 w-4" />} />
        <StatCard title="Prob. fermeture" value={`${stats?.avgClose ?? 0}%`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard title="Confiance" value={`${stats?.avgConfidence ?? 0}%`} icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-destructive/30 bg-destructive/5 mb-6">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">Erreur lors du chargement : {(error as Error).message}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading ? (
        <LoadingState />
      ) : !leads?.length ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-center">
          <Brain className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Aucun lead prédictif</h3>
          <p className="text-sm text-muted-foreground max-w-md">Les leads apparaîtront ici une fois ingérés via l'API d'intake.</p>
        </motion.div>
      ) : (
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Leads scorés ({leads.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Qualité</TableHead>
                    <TableHead>Valeur contrat</TableHead>
                    <TableHead>Prob. close</TableHead>
                    <TableHead>Risque</TableHead>
                    <TableHead>Prochaine action</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Métier</TableHead>
                    <TableHead>Urgence</TableHead>
                    <TableHead>Confiance</TableHead>
                    <TableHead>
                      <Clock className="h-3.5 w-3.5" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead: any) => {
                    const pred = lead.market_lead_predictions?.[0];
                    const risk = lead.market_lead_risk_scores?.[0];
                    const action = lead.market_next_best_actions?.sort((a: any, b: any) => a.priority - b.priority)?.[0];

                    return (
                      <TableRow key={lead.id}>
                        <TableCell>{pred ? qualityBadge(pred.predicted_lead_quality_score) : "—"}</TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {pred ? formatCurrency(pred.predicted_contract_value) : "—"}
                        </TableCell>
                        <TableCell>
                          {pred ? (
                            <span className={pred.predicted_close_probability >= 0.5 ? "text-green-600" : "text-muted-foreground"}>
                              {Math.round(pred.predicted_close_probability * 100)}%
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>{risk ? riskBadge(risk.risk_level) : "—"}</TableCell>
                        <TableCell>
                          {action ? (
                            <span className="text-xs text-muted-foreground">{action.action_label}</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{lead.city_slug || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{lead.trade_slug || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{lead.urgency_level || "normal"}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {pred ? `${Math.round(pred.confidence_score * 100)}%` : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(lead.created_at).toLocaleDateString("fr-CA")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
};

export default AdminPredictiveLeads;

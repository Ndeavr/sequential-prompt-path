import { useParams } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMaintenancePlans } from "@/hooks/useSyndicate";
import { motion } from "framer-motion";
import { Wrench, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  planned: { label: "Planifié", color: "secondary", icon: Clock },
  in_progress: { label: "En cours", color: "default", icon: Wrench },
  completed: { label: "Complété", color: "default", icon: CheckCircle2 },
  overdue: { label: "En retard", color: "destructive", icon: AlertCircle },
};

const SyndicateMaintenance = () => {
  const { id } = useParams<{ id: string }>();
  const { data: plans, isLoading } = useMaintenancePlans(id);

  if (isLoading) return <DashboardLayout><LoadingState /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader title="Entretien" description="Plan de maintenance et suivi des travaux" />

      {!plans?.length ? (
        <EmptyState
          icon={<Wrench className="h-10 w-10 text-muted-foreground/40" />}
          title="Aucun plan de maintenance"
          description="Créez un plan d'entretien annuel pour votre immeuble."
        />
      ) : (
        <div className="space-y-6">
          {plans.map((plan: any, pi: number) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pi * 0.08 }}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{plan.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{plan.plan_year}</Badge>
                      <Badge variant="secondary">{plan.status}</Badge>
                    </div>
                  </div>
                  {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
                </CardHeader>
                <CardContent>
                  {!plan.syndicate_maintenance_items?.length ? (
                    <p className="text-sm text-muted-foreground">Aucun item dans ce plan.</p>
                  ) : (
                    <div className="space-y-2">
                      {plan.syndicate_maintenance_items.map((item: any) => {
                        const cfg = statusConfig[item.status] || statusConfig.planned;
                        const Icon = cfg.icon;
                        return (
                          <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{item.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant={cfg.color as any} className="text-xs">{cfg.label}</Badge>
                                  {item.scheduled_date && (
                                    <span className="text-xs text-muted-foreground">
                                      {format(new Date(item.scheduled_date), "d MMM yyyy", { locale: fr })}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">{Number(item.estimated_cost).toLocaleString("fr-CA")} $</p>
                              {item.actual_cost !== null && item.actual_cost !== undefined && (
                                <p className="text-xs text-muted-foreground">Réel: {Number(item.actual_cost).toLocaleString("fr-CA")} $</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default SyndicateMaintenance;

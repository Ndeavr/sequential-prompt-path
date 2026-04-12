import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingDown, Calculator } from "lucide-react";
import { useRevenueLossEstimations } from "@/hooks/useOutboundEliteData";

export default function PageOutboundRevenue() {
  const { data: estimations, isLoading } = useRevenueLossEstimations();

  const totalMonthly = estimations?.reduce((a: number, e: any) => a + (e.monthly_loss || 0), 0) || 0;
  const totalYearly = estimations?.reduce((a: number, e: any) => a + (e.yearly_loss || 0), 0) || 0;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <DollarSign className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Revenue Loss Engine</h1>
          <p className="text-sm text-muted-foreground">Calculer l'argent laissé sur la table par prospect</p>
        </div>
      </div>

      {/* Formula */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Formule de calcul</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-muted/50 text-center space-y-2">
            <p className="text-sm font-mono">monthly_loss = lost_leads × avg_job_value</p>
            <p className="text-sm font-mono">yearly_loss = monthly_loss × 12</p>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingDown className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-red-500">{totalMonthly.toLocaleString("fr-CA")} $</p>
            <p className="text-sm text-muted-foreground">Perte mensuelle estimée</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <TrendingDown className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-red-600">{totalYearly.toLocaleString("fr-CA")} $</p>
            <p className="text-sm text-muted-foreground">Perte annuelle estimée</p>
          </CardContent>
        </Card>
      </div>

      {/* Estimations List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estimations par prospect</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Chargement…</p>
          ) : !estimations?.length ? (
            <p className="text-sm text-muted-foreground">Aucune estimation calculée.</p>
          ) : (
            <div className="space-y-2">
              {estimations.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{e.company_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{e.city} · AIPP: {e.aipp_score ?? "—"} · {e.lost_leads_per_month} leads/mois × {e.avg_job_value}$</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-500">{(e.monthly_loss || 0).toLocaleString("fr-CA")} $/mois</p>
                    <p className="text-xs text-muted-foreground">{(e.yearly_loss || 0).toLocaleString("fr-CA")} $/an</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  </AdminLayout>
  );
}

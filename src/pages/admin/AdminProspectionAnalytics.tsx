/**
 * UNPRO — Prospection Analytics
 * Conversion funnel, campaign performance, ROI tracking.
 */
import AdminLayout from "@/layouts/AdminLayout";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Target, Mail, MousePointer, Play, CheckCircle2,
  TrendingUp, ArrowRight,
} from "lucide-react";

const AdminProspectionAnalytics = () => {
  const { data: funnel } = useQuery({
    queryKey: ["prospection-funnel"],
    queryFn: async () => {
      const { data } = await supabase.from("prospects").select("status, aipp_pre_score, campaign_id");
      if (!data) return null;
      const total = data.length;
      const scored = data.filter((p: any) => Number(p.aipp_pre_score) > 0).length;
      const contacted = data.filter((p: any) => ["contacted", "opened", "clicked", "started_onboarding", "converted"].includes(p.status)).length;
      const opened = data.filter((p: any) => ["opened", "clicked", "started_onboarding", "converted"].includes(p.status)).length;
      const clicked = data.filter((p: any) => ["clicked", "started_onboarding", "converted"].includes(p.status)).length;
      const started = data.filter((p: any) => ["started_onboarding", "converted"].includes(p.status)).length;
      const converted = data.filter((p: any) => p.status === "converted").length;
      return { total, scored, contacted, opened, clicked, started, converted };
    },
  });

  const { data: campaigns } = useQuery({
    queryKey: ["prospection-campaign-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("prospection_campaigns")
        .select("id, name, target_category, target_city, target_count, status")
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const funnelSteps = funnel ? [
    { label: "Découverts", value: funnel.total, icon: Users, color: "text-gray-400" },
    { label: "Scorés AIPP", value: funnel.scored, icon: Target, color: "text-violet-400" },
    { label: "Contactés", value: funnel.contacted, icon: Mail, color: "text-amber-400" },
    { label: "Ouvert email", value: funnel.opened, icon: Mail, color: "text-orange-400" },
    { label: "Cliqué lien", value: funnel.clicked, icon: MousePointer, color: "text-pink-400" },
    { label: "Démarré Alex", value: funnel.started, icon: Play, color: "text-emerald-400" },
    { label: "Converti Signature", value: funnel.converted, icon: CheckCircle2, color: "text-green-400" },
  ] : [];

  return (
    <AdminLayout>
      <PageHeader title="Analytics Prospection" description="Funnel de conversion et performance des campagnes" />

      {/* Funnel */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Funnel de conversion
          </CardTitle>
        </CardHeader>
        <CardContent>
          {funnel ? (
            <div className="flex flex-wrap items-center gap-2">
              {funnelSteps.map((step, i) => (
                <div key={step.label} className="flex items-center gap-2">
                  <div className="text-center min-w-[100px]">
                    <div className={`text-2xl font-bold ${step.color}`}>{step.value}</div>
                    <div className="text-xs text-muted-foreground">{step.label}</div>
                    {i > 0 && funnel.total > 0 && (
                      <div className="text-[10px] text-muted-foreground/60">
                        {Math.round((step.value / funnel.total) * 100)}%
                      </div>
                    )}
                  </div>
                  {i < funnelSteps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground/30" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">Chargement...</p>
          )}
        </CardContent>
      </Card>

      {/* Campaigns Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance par campagne</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-3 font-medium text-muted-foreground">Campagne</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Catégorie</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Ville</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Cible</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Statut</th>
              </tr>
            </thead>
            <tbody>
              {(campaigns ?? []).map((c: any) => (
                <tr key={c.id} className="border-b border-border/30 hover:bg-muted/30">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-muted-foreground">{c.target_category ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.target_city ?? "—"}</td>
                  <td className="p-3 text-center font-mono">{c.target_count}</td>
                  <td className="p-3 text-center">
                    <span className="text-xs text-muted-foreground">{c.status}</span>
                  </td>
                </tr>
              ))}
              {(!campaigns || campaigns.length === 0) && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Aucune campagne</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminProspectionAnalytics;

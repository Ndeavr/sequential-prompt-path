import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Zap, Send, TrendingUp, ArrowLeft, Mail, Globe } from "lucide-react";
import { useProspectsWithScores, useCampagnesAcquisition, useProspectDetail, useGenerateAIPPScore, useGenerateEmail } from "@/hooks/useAcquisitionPipeline";
import TableProspectsAIPP from "@/components/acquisition-pipeline/TableProspectsAIPP";
import CardScoreAIPPProspect from "@/components/acquisition-pipeline/CardScoreAIPPProspect";
import PanelAnalyseAIPP from "@/components/acquisition-pipeline/PanelAnalyseAIPP";
import PanelPreviewEmailDynamique from "@/components/acquisition-pipeline/PanelPreviewEmailDynamique";
import PanelTimelineSequence from "@/components/acquisition-pipeline/PanelTimelineSequence";
import PanelPerformanceCampagne from "@/components/acquisition-pipeline/PanelPerformanceCampagne";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <Card className="bg-gradient-to-br from-background to-muted/10">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="text-[11px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PageAdminPipelineProspects() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: prospects = [], isLoading } = useProspectsWithScores();
  const { data: campagnes = [] } = useCampagnesAcquisition();
  const { data: detail } = useProspectDetail(selectedId);
  const generateScore = useGenerateAIPPScore();
  const generateEmail = useGenerateEmail();

  const totalProspects = prospects.length;
  const scored = prospects.filter((p) => p.score).length;
  const contacted = prospects.filter((p) => p.status === "contacted" || p.status === "contacté").length;

  // Build timeline steps from detail
  const timelineSteps = detail ? [
    { type: "score" as const, label: "Score AIPP", status: detail.score ? "done" as const : "pending" as const, detail: detail.score ? `Score global: ${Math.round((detail.score.score_visibilite + detail.score.score_conversion + detail.score.score_confiance) / 3)}` : undefined },
    ...(detail.screenshots || []).map((s) => ({ type: "screenshot" as const, label: "Capture d'écran", status: "done" as const, detail: "Screenshot annoté capturé" })),
    ...(detail.emails || []).map((e) => ({ type: "email" as const, label: `Email — ${e.sujet}`, status: e.statut === "envoye" ? "done" as const : e.statut === "echoue" ? "error" as const : "pending" as const, detail: `Étape ${e.etape} · ${e.langue.toUpperCase()}` })),
    ...(detail.sms || []).map((s) => ({ type: "sms" as const, label: "SMS", status: s.statut === "envoye" ? "done" as const : "pending" as const, detail: s.message.substring(0, 60) })),
  ] : [];

  if (selectedId && detail) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />Retour au pipeline
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl font-bold text-foreground">{detail.prospect?.business_name || "Prospect"}</h1>
          <Badge variant="outline" className="text-xs">
            <Globe className="h-3 w-3 mr-1" />
            {detail.prospect?.langue_preferee?.toUpperCase() || "FR"}
          </Badge>
          {detail.prospect?.main_city && (
            <span className="text-sm text-muted-foreground">{detail.prospect.main_city}</span>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {!detail.score && (
            <Button size="sm" onClick={() => generateScore.mutate(selectedId)} disabled={generateScore.isPending}>
              <Zap className="h-3.5 w-3.5 mr-1" />Générer Score AIPP
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => generateEmail.mutate({ prospectId: selectedId, langue: detail.prospect?.langue_preferee || "fr" })} disabled={generateEmail.isPending}>
            <Mail className="h-3.5 w-3.5 mr-1" />Générer Email
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <CardScoreAIPPProspect score={detail.score} />
            <PanelAnalyseAIPP insights={detail.insights as any} />
          </div>
          <div className="space-y-4">
            <PanelPreviewEmailDynamique emails={(detail.emails || []) as any} />
            <PanelTimelineSequence steps={timelineSteps} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      {/* Hero */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pipeline Acquisition AIPP</h1>
        <p className="text-sm text-muted-foreground mt-1">Scraper → Enrichir → Scorer → Générer → Envoyer → Tracker</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Prospects" value={totalProspects} icon={Users} color="#3b82f6" />
        <StatCard label="Scorés AIPP" value={scored} icon={Zap} color="#f59e0b" />
        <StatCard label="Contactés" value={contacted} icon={Send} color="#10b981" />
        <StatCard label="Campagnes" value={campagnes.length} icon={TrendingUp} color="#8b5cf6" />
      </div>

      <Tabs defaultValue="prospects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="prospects">Prospects</TabsTrigger>
          <TabsTrigger value="campagnes">Campagnes</TabsTrigger>
        </TabsList>

        <TabsContent value="prospects">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Prospects ({totalProspects})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <TableProspectsAIPP
                  prospects={prospects}
                  onSelect={setSelectedId}
                  onGenerateScore={(id) => generateScore.mutate(id)}
                  isGenerating={generateScore.isPending}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campagnes">
          <PanelPerformanceCampagne campagnes={campagnes as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

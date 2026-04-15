import { useState } from "react";
import PanelGoogleBusinessSearchTester from "@/components/go-live/PanelGoogleBusinessSearchTester";
import CardBusinessImportPreview from "@/components/go-live/CardBusinessImportPreview";
import DashboardGoLiveControlCenter from "@/components/go-live/DashboardGoLiveControlCenter";
import WidgetConversionByStep from "@/components/go-live/WidgetConversionByStep";
import TimelineContractorActivationFlow from "@/components/go-live/TimelineContractorActivationFlow";
import PanelOutboundSequenceStatus from "@/components/go-live/PanelOutboundSequenceStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, AlertTriangle, Search, CreditCard } from "lucide-react";
import type { GmbCandidate } from "@/components/go-live/FormGoogleBusinessLookup";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function PageAdminGoLive() {
  const [importedCandidate, setImportedCandidate] = useState<GmbCandidate | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleImport = async (candidate: GmbCandidate) => {
    setImportedCandidate(candidate);
  };

  const handleConfirmImport = async () => {
    if (!importedCandidate) return;
    setIsImporting(true);
    try {
      const { error } = await supabase.from("contractor_import_snapshots").insert({
        business_name: importedCandidate.name,
        google_place_id: importedCandidate.place_id,
        business_payload: {
          formatted_address: importedCandidate.formatted_address,
          phone: importedCandidate.phone,
          website: importedCandidate.website,
          rating: importedCandidate.rating,
          review_count: importedCandidate.review_count,
          categories: importedCandidate.all_categories,
          photos: importedCandidate.photos,
          opening_hours: importedCandidate.opening_hours,
        } as any,
        import_source: "gmb_admin",
      });

      if (error) throw error;

      toast({
        title: "Import réussi",
        description: `${importedCandidate.name} a été importé avec succès.`,
      });
      setImportedCandidate(null);
    } catch (err: any) {
      toast({
        title: "Erreur d'import",
        description: err.message || "Impossible d'importer cette entreprise.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualImport = async (data: { business_name: string; city: string; phone: string; website: string }) => {
    try {
      const { error } = await supabase.from("contractor_import_snapshots").insert({
        business_name: data.business_name,
        business_payload: {
          city: data.city,
          phone: data.phone,
          website: data.website,
        } as any,
        import_source: "manual_admin",
      });

      if (error) throw error;

      toast({
        title: "Import manuel réussi",
        description: `${data.business_name} a été importé manuellement.`,
      });
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Go-Live Control Center
        </h1>
        <p className="text-sm text-muted-foreground">
          Tableau de bord opérationnel — funnel contractor complet
        </p>
      </div>

      {/* Quick Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "GMB Search", status: "ok", icon: Search },
          { label: "Import", status: "ok", icon: CheckCircle2 },
          { label: "Outbound", status: "warning", icon: AlertTriangle },
          { label: "Stripe", status: "ok", icon: CreditCard },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-3 flex items-center gap-2">
              <item.icon className={`h-4 w-4 ${item.status === "ok" ? "text-emerald-400" : item.status === "warning" ? "text-amber-400" : "text-destructive"}`} />
              <div>
                <p className="text-xs font-medium text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{item.status}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Real-time Metrics Dashboard */}
      <DashboardGoLiveControlCenter />

      {/* Conversion Funnel + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WidgetConversionByStep />
        <TimelineContractorActivationFlow />
      </div>

      {/* Outbound Status */}
      <PanelOutboundSequenceStatus />

      {/* GMB Search Tester */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          Testeur de recherche GMB
        </h2>
        {importedCandidate ? (
          <CardBusinessImportPreview
            candidate={importedCandidate}
            onConfirm={handleConfirmImport}
            onCancel={() => setImportedCandidate(null)}
            isImporting={isImporting}
          />
        ) : (
          <PanelGoogleBusinessSearchTester
            onImport={handleImport}
            onManualImport={handleManualImport}
          />
        )}
      </div>
    </div>
  );
}

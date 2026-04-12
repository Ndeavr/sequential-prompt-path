import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Scan, Zap, TrendingUp } from "lucide-react";

interface Props {
  companyId: string;
  companyName: string;
  hasEnrichment: boolean;
  hasScore: boolean;
  onComplete: () => void;
}

export function PanelAIPPPreviewGenerator({ companyId, companyName, hasEnrichment, hasScore, onComplete }: Props) {
  const [enriching, setEnriching] = useState(false);
  const [scoring, setScoring] = useState(false);

  async function runEnrich() {
    setEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke("edge-enrich-prospect", {
        body: { company_id: companyId },
      });
      if (error) throw error;
      toast.success("Enrichissement terminé");
      onComplete();
    } catch (e: any) {
      toast.error(e.message || "Erreur enrichissement");
    } finally {
      setEnriching(false);
    }
  }

  async function runScore() {
    setScoring(true);
    try {
      const { data, error } = await supabase.functions.invoke("edge-generate-aipp-preview", {
        body: { company_id: companyId },
      });
      if (error) throw error;
      toast.success("Score AIPP généré");
      onComplete();
    } catch (e: any) {
      toast.error(e.message || "Erreur scoring");
    } finally {
      setScoring(false);
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> AIPP Preview Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Analysez la présence web de <strong>{companyName}</strong> et générez un score AIPP préliminaire.
        </p>

        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant={hasEnrichment ? "outline" : "default"}
            onClick={runEnrich}
            disabled={enriching}
            className="w-full justify-start"
          >
            {enriching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Scan className="h-4 w-4 mr-2" />}
            {hasEnrichment ? "Re-scanner le site" : "Scanner le site web"}
            {hasEnrichment && <Badge variant="outline" className="ml-auto text-xs bg-emerald-500/10 text-emerald-400">✓</Badge>}
          </Button>

          <Button
            size="sm"
            variant={hasScore ? "outline" : "default"}
            onClick={runScore}
            disabled={scoring || !hasEnrichment}
            className="w-full justify-start"
          >
            {scoring ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
            {hasScore ? "Recalculer le score AIPP" : "Calculer le score AIPP"}
            {hasScore && <Badge variant="outline" className="ml-auto text-xs bg-emerald-500/10 text-emerald-400">✓</Badge>}
          </Button>
        </div>

        {!hasEnrichment && (
          <p className="text-xs text-amber-400">⚡ Scannez d'abord le site avant de calculer le score</p>
        )}
      </CardContent>
    </Card>
  );
}

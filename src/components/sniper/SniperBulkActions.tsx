import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, FileText, Send, Flame, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function SniperBulkActions({ targets, onRefresh }: { targets: any[]; onRefresh: () => void }) {
  const [enriching, setEnriching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [heatUpdating, setHeatUpdating] = useState(false);
  const { toast } = useToast();

  const pendingCount = targets.filter(t => t.enrichment_status === "pending").length;
  const enrichedNoAssets = targets.filter(t => t.enrichment_status === "enriched" && !t.latest_outreach_target_id).length;
  const messageReady = targets.filter(t => t.outreach_status === "message_ready").length;

  async function enrichAll() {
    setEnriching(true);
    const pending = targets.filter(t => t.enrichment_status === "pending");
    let done = 0;
    for (const t of pending) {
      await supabase.functions.invoke("sniper-enrich-target", { body: { targetId: t.id } });
      done++;
    }
    toast({ title: "Enrichissement terminé", description: `${done} cibles enrichies` });
    setEnriching(false);
    onRefresh();
  }

  async function generateAll() {
    setGenerating(true);
    const eligible = targets.filter(t => t.enrichment_status === "enriched" && !t.latest_outreach_target_id);
    let done = 0;
    for (const t of eligible) {
      await supabase.functions.invoke("sniper-generate-assets", { body: { targetId: t.id } });
      done++;
    }
    toast({ title: "Génération terminée", description: `${done} pages et messages créés` });
    setGenerating(false);
    onRefresh();
  }

  async function sendBatch() {
    setSending(true);
    const { data } = await supabase.functions.invoke("sniper-queue-send", { body: { batchSize: 50 } });
    toast({ title: "Envoi batch terminé", description: `${data?.sent || 0} envoyés` });
    setSending(false);
    onRefresh();
  }

  async function updateHeat() {
    setHeatUpdating(true);
    const { data } = await supabase.functions.invoke("sniper-update-heat", { body: {} });
    toast({ title: "Heat mis à jour", description: `${data?.updated || 0} cibles recalculées` });
    setHeatUpdating(false);
    onRefresh();
  }

  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={enrichAll} disabled={enriching || pendingCount === 0}>
          {enriching ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Zap className="w-3 h-3 mr-2" />}
          Enrichir ({pendingCount})
        </Button>
        <Button variant="outline" size="sm" onClick={generateAll} disabled={generating || enrichedNoAssets === 0}>
          {generating ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <FileText className="w-3 h-3 mr-2" />}
          Générer assets ({enrichedNoAssets})
        </Button>
        <Button variant="outline" size="sm" onClick={sendBatch} disabled={sending || messageReady === 0}>
          {sending ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Send className="w-3 h-3 mr-2" />}
          Envoyer batch ({messageReady})
        </Button>
        <Button variant="outline" size="sm" onClick={updateHeat} disabled={heatUpdating}>
          {heatUpdating ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Flame className="w-3 h-3 mr-2" />}
          Recalculer heat
        </Button>
      </CardContent>
    </Card>
  );
}

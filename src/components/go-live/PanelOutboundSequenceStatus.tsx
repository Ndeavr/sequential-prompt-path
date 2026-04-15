import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Pause, Play, Square, AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OutboundSequence {
  id: string;
  sequence_name: string;
  is_active: boolean;
  channel: string;
  sequence_type: string;
  target_type: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  draft: { color: "text-muted-foreground", icon: Clock },
  running: { color: "text-emerald-400", icon: Play },
  paused: { color: "text-amber-400", icon: Pause },
  blocked: { color: "text-destructive", icon: AlertCircle },
  completed: { color: "text-primary", icon: CheckCircle2 },
  cancelled: { color: "text-muted-foreground", icon: Square },
};

export default function PanelOutboundSequenceStatus() {
  const [sequences, setSequences] = useState<OutboundSequence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSequences();
  }, []);

  const loadSequences = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("outbound_sequences")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setSequences((data as any[]) || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from("outbound_sequences").update({ status: newStatus }).eq("id", id);
    loadSequences();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Séquences Outbound
          <Badge variant="outline" className="ml-auto text-xs">{sequences.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sequences.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Aucune séquence active</p>
        )}
        {sequences.map((seq) => {
          const config = STATUS_CONFIG[seq.status] || STATUS_CONFIG.draft;
          const Icon = config.icon;
          return (
            <div key={seq.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card">
              <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{seq.sequence_name || "Sans nom"}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>Étape {seq.current_step_order || 0}</span>
                  <span>•</span>
                  <span className="capitalize">{seq.status}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {seq.status === "running" && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus(seq.id, "paused")}>
                    <Pause className="h-3.5 w-3.5" />
                  </Button>
                )}
                {seq.status === "paused" && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateStatus(seq.id, "running")}>
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                )}
                {(seq.status === "running" || seq.status === "paused") && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateStatus(seq.id, "cancelled")}>
                    <Square className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

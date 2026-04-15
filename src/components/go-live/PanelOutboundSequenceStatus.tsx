import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Pause, Play, CheckCircle2, Clock, Loader2 } from "lucide-react";
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
      .select("id, sequence_name, is_active, channel, sequence_type, target_type, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setSequences((data as any[]) || []);
    setLoading(false);
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase.from("outbound_sequences").update({ is_active: !currentActive }).eq("id", id);
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
          <p className="text-sm text-muted-foreground text-center py-4">Aucune séquence</p>
        )}
        {sequences.map((seq) => (
          <div key={seq.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card">
            {seq.is_active ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{seq.sequence_name || "Sans nom"}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="capitalize">{seq.channel || "email"}</span>
                <span>•</span>
                <span>{seq.is_active ? "Active" : "Inactive"}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => toggleActive(seq.id, seq.is_active)}
            >
              {seq.is_active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

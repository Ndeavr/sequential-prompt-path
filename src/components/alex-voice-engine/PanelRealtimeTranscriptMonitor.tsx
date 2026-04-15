import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUnderstandingLogs } from "@/hooks/useAlexVoiceEngine";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Zap } from "lucide-react";

export default function PanelRealtimeTranscriptMonitor() {
  const { data: logs = [], isLoading } = useUnderstandingLogs(50);

  if (isLoading) return <Skeleton className="h-60" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Monitor — Transcripts & Compréhension
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucun log disponible.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((l: any) => {
              const conf = Number(l.understanding_confidence ?? 0);
              const confColor = conf >= 0.8 ? "text-emerald-400" : conf >= 0.5 ? "text-amber-400" : "text-red-400";
              return (
                <div key={l.id} className="p-3 rounded-lg border hover:bg-muted/30 text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{l.detected_language ?? "?"}</Badge>
                    {l.detected_intent && <Badge className="text-xs bg-primary/20 text-primary">{l.detected_intent}</Badge>}
                    {l.fallback_triggered && <Badge className="text-xs bg-red-500/20 text-red-400">Fallback</Badge>}
                    <span className={`ml-auto text-xs font-mono ${confColor}`}>
                      {(conf * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Brut: </span>
                    <span className="font-mono">{l.raw_transcript || "—"}</span>
                  </div>
                  {l.normalized_transcript && l.normalized_transcript !== l.raw_transcript && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Normalisé: </span>
                      <span className="font-medium">{l.normalized_transcript}</span>
                    </div>
                  )}
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {l.latency_stt_ms != null && <span><Zap className="w-3 h-3 inline" /> STT {l.latency_stt_ms}ms</span>}
                    {l.latency_llm_ms != null && <span>LLM {l.latency_llm_ms}ms</span>}
                    {l.latency_tts_ms != null && <span>TTS {l.latency_tts_ms}ms</span>}
                    {l.total_latency_ms != null && <span className="font-medium text-foreground">Total {l.total_latency_ms}ms</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

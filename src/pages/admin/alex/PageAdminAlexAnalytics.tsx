/**
 * PageAdminAlexAnalytics — Runtime analytics for Alex voice quality.
 */
import PanelRealtimeTranscriptMonitor from "@/components/alex-voice-engine/PanelRealtimeTranscriptMonitor";
import WidgetVoiceMetrics from "@/components/alex-voice-engine/WidgetVoiceMetrics";
import { BarChart3 } from "lucide-react";

export default function PageAdminAlexAnalytics() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <BarChart3 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Alex — Analytics voix</h1>
          <p className="text-sm text-muted-foreground">Métriques de compréhension, latence, fallbacks et qualité conversationnelle.</p>
        </div>
      </div>

      <WidgetVoiceMetrics />
      <PanelRealtimeTranscriptMonitor />
    </div>
  );
}

/**
 * PageAdminAlexVoice — Admin page for Alex French voice selection, testing, and fallbacks.
 */
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVoiceProfiles } from "@/hooks/useAlexVoiceEngine";
import CardVoiceCandidatePreview from "@/components/alex-voice-engine/CardVoiceCandidatePreview";
import PanelFrenchPronunciationBench from "@/components/alex-voice-engine/PanelFrenchPronunciationBench";
import PanelFallbackVoiceLogic from "@/components/alex-voice-engine/PanelFallbackVoiceLogic";
import WidgetVoiceMetrics from "@/components/alex-voice-engine/WidgetVoiceMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { Mic } from "lucide-react";

export default function PageAdminAlexVoice() {
  const { data: profiles = [], isLoading } = useVoiceProfiles();
  const [selectedProfileId, setSelectedProfileId] = useState<string | undefined>();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      {/* Hero */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Mic className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Alex — Sélection voix française</h1>
          <p className="text-sm text-muted-foreground">Comparer, tester et verrouiller la voix française native d'Alex.</p>
        </div>
      </div>

      {/* Metrics */}
      <WidgetVoiceMetrics />

      <Tabs defaultValue="profiles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profiles">Profils voix</TabsTrigger>
          <TabsTrigger value="tests">Tests prononciation</TabsTrigger>
          <TabsTrigger value="fallbacks">Fallbacks</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map((p: any) => (
                <CardVoiceCandidatePreview
                  key={p.id}
                  profile={p}
                  onPreview={() => setSelectedProfileId(p.id)}
                  onActivate={() => {}}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tests">
          <PanelFrenchPronunciationBench selectedVoiceProfileId={selectedProfileId || profiles[0]?.id} />
        </TabsContent>

        <TabsContent value="fallbacks">
          <PanelFallbackVoiceLogic />
        </TabsContent>
      </Tabs>
    </div>
  );
}

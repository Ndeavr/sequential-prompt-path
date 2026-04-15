/**
 * PageAdminAlexContext — Admin page for Alex context memory and intent routing.
 */
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PanelAlexContextMemory from "@/components/alex-voice-engine/PanelAlexContextMemory";
import TableIntentRoutingRules from "@/components/alex-voice-engine/TableIntentRoutingRules";
import TableTranscriptCorrections from "@/components/alex-voice-engine/TableTranscriptCorrections";
import { Brain } from "lucide-react";

export default function PageAdminAlexContext() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10">
          <Brain className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Alex — Contexte & Intentions</h1>
          <p className="text-sm text-muted-foreground">Mémoire de session, détection d'intention et normalisation STT.</p>
        </div>
      </div>

      <Tabs defaultValue="context" className="space-y-4">
        <TabsList>
          <TabsTrigger value="context">Mémoire contextuelle</TabsTrigger>
          <TabsTrigger value="intents">Règles d'intention</TabsTrigger>
          <TabsTrigger value="corrections">Corrections STT</TabsTrigger>
        </TabsList>

        <TabsContent value="context">
          <PanelAlexContextMemory />
        </TabsContent>

        <TabsContent value="intents">
          <TableIntentRoutingRules />
        </TabsContent>

        <TabsContent value="corrections">
          <TableTranscriptCorrections />
        </TabsContent>
      </Tabs>
    </div>
  );
}

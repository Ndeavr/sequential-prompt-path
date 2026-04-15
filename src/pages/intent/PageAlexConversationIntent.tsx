/**
 * PageAlexConversationIntent — Enhanced Alex conversation wired to intent funnel.
 */
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import PanelAlexVoiceChat from "@/components/intent-funnel/PanelAlexVoiceChat";

export default function PageAlexConversationIntent() {
  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Parler à Alex</title>
        <meta name="description" content="Décrivez votre besoin à Alex, notre assistant IA, et obtenez une recommandation instantanée." />
      </Helmet>
      <div className="min-h-screen">
        <PanelAlexVoiceChat />
      </div>
    </MainLayout>
  );
}

/**
 * PageAlexConversationIntent — Enhanced Alex conversation wired to intent funnel.
 * Surfaces the Contractor Advisor Panel for any user in contractor mode
 * (role = contractor OR contractor profile exists).
 */
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import PanelAlexVoiceChat from "@/components/intent-funnel/PanelAlexVoiceChat";
import PanelContractorAdvisorAlex from "@/components/PanelContractorAdvisorAlex";
import { useContractorMode } from "@/hooks/useContractorMode";

export default function PageAlexConversationIntent() {
  const { isContractorMode } = useContractorMode();

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Parler à Alex</title>
        <meta name="description" content="Décrivez votre besoin à Alex, notre assistant IA, et obtenez une recommandation instantanée." />
      </Helmet>
      <div className="min-h-screen">
        {isContractorMode && (
          <div className="px-4 pt-6">
            <PanelContractorAdvisorAlex surface="chat" hideOpenChatCta />
          </div>
        )}
        {/* Homeowner / generic fallback only when NOT in contractor mode */}
        {!isContractorMode && <PanelAlexVoiceChat />}
      </div>
    </MainLayout>
  );
}


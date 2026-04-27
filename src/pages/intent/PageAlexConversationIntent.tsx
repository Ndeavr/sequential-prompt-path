/**
 * PageAlexConversationIntent — Enhanced Alex conversation wired to intent funnel.
 * Surfaces the Contractor Advisor Panel for logged-in entrepreneurs.
 */
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import PanelAlexVoiceChat from "@/components/intent-funnel/PanelAlexVoiceChat";
import PanelContractorAdvisorAlex from "@/components/PanelContractorAdvisorAlex";
import { useContractorProfile } from "@/hooks/useContractor";

export default function PageAlexConversationIntent() {
  const { data: contractor } = useContractorProfile();
  const isContractor = !!contractor;

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Parler à Alex</title>
        <meta name="description" content="Décrivez votre besoin à Alex, notre assistant IA, et obtenez une recommandation instantanée." />
      </Helmet>
      <div className="min-h-screen">
        {isContractor && (
          <div className="px-4 pt-6">
            <PanelContractorAdvisorAlex surface="chat" hideOpenChatCta />
          </div>
        )}
        <PanelAlexVoiceChat />
      </div>
    </MainLayout>
  );
}

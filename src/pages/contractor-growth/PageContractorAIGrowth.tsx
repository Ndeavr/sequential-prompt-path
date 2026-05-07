/**
 * /contractor-ai-growth — Alex Contractor Conversion Flow (entry)
 *
 * Pour cette première itération, on monte l'expérience voice-first contractor
 * existante (Alex démarre automatiquement, voix Charlotte FR verrouillée par
 * AlexVoiceContext + memory contractor-master-message). Les étapes avancées
 * (analyse cinématique, score reveal, plan recommendation, checkout inline,
 * activation animée, notif admin) seront greffées dans des itérations suivantes
 * via un orchestrateur ContractorGrowthExperience.
 */
import PageContractorVoiceFirstLanding from "@/pages/contractor-landing/PageContractorVoiceFirstLanding";

export default function PageContractorAIGrowth() {
  return <PageContractorVoiceFirstLanding />;
}

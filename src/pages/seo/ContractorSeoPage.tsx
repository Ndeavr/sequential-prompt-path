/**
 * UNPRO — /entrepreneur/:slug
 * Delegates to the unified ContractorRecommendationPage (AI recommendation reference).
 */
import ContractorRecommendationPage from "@/features/contractorProfile/recommendationPage/ContractorRecommendationPage";

export default function ContractorSeoPage() {
  return <ContractorRecommendationPage />;
}

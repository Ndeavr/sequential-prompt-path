/**
 * UNPRO — /contractor/:slug/:city
 * Delegates to the new ContractorRecommendationPage (single unified rendering).
 */
import ContractorRecommendationPage from "@/features/contractorProfile/recommendationPage/ContractorRecommendationPage";

export default function ContractorCityPage() {
  return <ContractorRecommendationPage />;
}

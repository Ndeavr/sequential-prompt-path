import { useParams } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { LoadingState, ErrorState } from "@/components/shared";
import {
  useProperty,
  usePropertyScore,
  usePropertyRecommendations,
  usePropertyEvents,
} from "@/hooks/usePropertyPassport";
import PropertyHeader from "@/components/property/PropertyHeader";
import PropertyScoreCard from "@/components/property/PropertyScoreCard";
import PropertyScoreGrid from "@/components/property/PropertyScoreGrid";
import PropertyRecommendations from "@/components/property/PropertyRecommendations";
import PropertyTimeline from "@/components/property/PropertyTimeline";
import PropertyDocuments from "@/components/property/PropertyDocuments";
import AnalyzePropertyButton from "@/components/property/AnalyzePropertyButton";

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: property, isLoading, error } = useProperty(id);
  const { data: score, refetch: refetchScore } = usePropertyScore(id);
  const { data: recommendations = [], refetch: refetchRecs } = usePropertyRecommendations(id);
  const { data: events = [], refetch: refetchEvents } = usePropertyEvents(id);

  const handleAnalysisDone = () => {
    refetchScore();
    refetchRecs();
    refetchEvents();
  };

  if (isLoading) return <DashboardLayout><LoadingState /></DashboardLayout>;
  if (error || !property) return <DashboardLayout><ErrorState message="Propriété introuvable." /></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <PropertyHeader property={property} />

        {/* Score section */}
        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="space-y-5">
            <PropertyScoreCard score={score} />
            <AnalyzePropertyButton propertyId={property.id} onDone={handleAnalysisDone} />
          </div>
          <PropertyScoreGrid score={score} />
        </div>

        {/* Content sections */}
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <PropertyRecommendations items={recommendations} />
          <PropertyDocuments propertyId={property.id} />
        </div>

        <PropertyTimeline items={events} />
      </div>
    </DashboardLayout>
  );
};

export default PropertyDetail;

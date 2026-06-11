/**
 * UNPRO — Page standalone Vision IA 5 Ans
 * Accessible via SMS / lien direct : /entrepreneur/vision-5-ans/:companyId
 */
import { useNavigate, useParams } from "react-router-dom";
import { VisionIAModule } from "@/features/visionIA";

export default function PageVision5Ans() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  if (!companyId) {
    return (
      <div className="min-h-screen alex-immersive flex items-center justify-center p-6">
        <p className="text-readable-body">Lien invalide.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen alex-immersive">
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">
        <VisionIAModule
          companyId={companyId}
          onCTA={() => navigate(`/entrepreneur/aipp-builder?company=${companyId}`)}
        />
      </div>
    </div>
  );
}

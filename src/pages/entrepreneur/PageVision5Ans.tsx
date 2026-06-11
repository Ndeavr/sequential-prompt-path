/**
 * UNPRO — Page standalone Vision IA 5 Ans
 * Accessible via SMS / lien direct : /entrepreneur/vision-5-ans/:companyId
 * Aussi atteignable dans le flow onboarding sans param (utilise sessionStorage).
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { VisionIAModule } from "@/features/visionIA";

const SESSION_KEY = "unpro_onboarding_company_id";

export default function PageVision5Ans() {
  const { companyId: paramId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | null>(paramId ?? null);

  useEffect(() => {
    if (paramId) {
      try { sessionStorage.setItem(SESSION_KEY, paramId); } catch {}
      setCompanyId(paramId);
      return;
    }
    try {
      const fromSession = sessionStorage.getItem(SESSION_KEY);
      if (fromSession) setCompanyId(fromSession);
    } catch {}
  }, [paramId]);

  if (!companyId) {
    return (
      <div className="min-h-screen alex-immersive flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-readable-body">Aucune entreprise active pour le moment.</p>
          <button
            className="text-cyan-300 underline text-sm"
            onClick={() => navigate("/entrepreneur/onboarding/import")}
          >
            Commencer l'import
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen alex-immersive">
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">
        <VisionIAModule
          companyId={companyId}
          onCTA={() => navigate("/entrepreneur/onboarding/plan")}
        />
      </div>
    </div>
  );
}

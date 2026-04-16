/**
 * SectionHomeCounterImpactIA — Embeddable counter section for the home page.
 * Clicking the counter cards navigates to /impact for full detail.
 */
import { FileCheck, Clock, DollarSign } from "lucide-react";
import { useImpactCounter } from "@/hooks/useImpactCounter";
import { formatNumberQc, formatCurrencyQc } from "@/lib/counterEngine";
import CounterCard from "./CounterCard";
import BadgeModelEstimateLive from "./BadgeModelEstimateLive";
import BannerImpactDisclaimer from "./BannerImpactDisclaimer";
import SectionContainer from "@/components/unpro/SectionContainer";
import { useNavigate } from "react-router-dom";

export default function SectionHomeCounterImpactIA() {
  const snap = useImpactCounter("realiste");
  const navigate = useNavigate();

  return (
    <SectionContainer width="default" className="py-10 md:py-14">
      <div className="text-center mb-8 space-y-3">
        <BadgeModelEstimateLive className="mx-auto" />
        <h2 className="section-title text-xl sm:text-2xl md:text-3xl">
          L'impact de l'IA sur les soumissions au Québec
        </h2>
        <p className="section-desc text-sm sm:text-base">
          Estimation en direct depuis le 1<sup>er</sup> janvier 2026
        </p>
      </div>

      <button
        onClick={() => navigate("/impact")}
        className="w-full text-left cursor-pointer hover:opacity-90 transition-opacity"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <CounterCard
            label="Soumissions épargnées"
            value={snap.savedSubmissions}
            formatter={formatNumberQc}
            icon={<FileCheck />}
            accentClass="text-primary"
          />
          <CounterCard
            label="Heures récupérées"
            value={snap.hoursSaved}
            formatter={formatNumberQc}
            icon={<Clock />}
            accentClass="text-accent"
          />
          <CounterCard
            label="Publicité épargnée"
            value={snap.adSavingsCad}
            formatter={formatCurrencyQc}
            icon={<DollarSign />}
            accentClass="text-success"
          />
        </div>
      </button>

      {snap.isDaytime && (
        <p className="text-center text-xs text-muted-foreground/70 mb-3">
          ☀️ Activité plus élevée en journée — les chiffres accélèrent entre 7 h et 22 h
        </p>
      )}

      <BannerImpactDisclaimer className="mt-2" />
    </SectionContainer>
  );
}

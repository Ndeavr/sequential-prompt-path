/**
 * SectionLandingContractorProofOfSavings — Compact counter for entrepreneur landing pages.
 */
import { FileCheck, Clock, DollarSign } from "lucide-react";
import { useImpactCounter } from "@/hooks/useImpactCounter";
import { formatNumberQc, formatCurrencyQc } from "@/lib/counterEngine";
import CounterCard from "./CounterCard";
import BadgeModelEstimateLive from "./BadgeModelEstimateLive";
import BannerImpactDisclaimer from "./BannerImpactDisclaimer";

export default function SectionLandingContractorProofOfSavings() {
  const snap = useImpactCounter("realiste");

  return (
    <section className="px-5 py-10 md:py-14 max-w-screen-xl mx-auto">
      <div className="text-center mb-6 space-y-2">
        <BadgeModelEstimateLive className="mx-auto" />
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold font-display text-foreground">
          Des milliers de soumissions inutiles déjà épargnées
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <CounterCard
          label="Soumissions"
          value={snap.savedSubmissions}
          formatter={formatNumberQc}
          icon={<FileCheck className="h-5 w-5" />}
          accentClass="text-primary"
          className="p-3 sm:p-4"
        />
        <CounterCard
          label="Heures"
          value={snap.hoursSaved}
          formatter={formatNumberQc}
          icon={<Clock className="h-5 w-5" />}
          accentClass="text-accent"
          className="p-3 sm:p-4"
        />
        <CounterCard
          label="Pub épargnée"
          value={snap.adSavingsCad}
          formatter={formatCurrencyQc}
          icon={<DollarSign className="h-5 w-5" />}
          accentClass="text-success"
          className="p-3 sm:p-4"
        />
      </div>

      <BannerImpactDisclaimer />
    </section>
  );
}

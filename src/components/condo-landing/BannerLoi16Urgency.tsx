/**
 * UNPRO Condo — Loi 16 Urgency Banner
 */
import { AlertTriangle } from "lucide-react";

export default function BannerLoi16Urgency() {
  return (
    <div className="bg-warning/10 border-y border-warning/20 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center gap-3 flex-wrap justify-center text-center">
        <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
        <p className="text-sm text-foreground">
          <span className="font-semibold">Loi&nbsp;16</span> · Documents éparpillés · Fonds de prévoyance · Attestation · Relève du&nbsp;CA
          <span className="text-muted-foreground ml-1">— Votre copropriété est-elle prête?</span>
        </p>
      </div>
    </div>
  );
}

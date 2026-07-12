/**
 * AvailabilityCard — Estimated availability window.
 */
import { CalendarCheck } from "lucide-react";
import { availabilityLabel } from "../logic/aiReferenceBuilder";

interface Props {
  key_: string;
}

export default function AvailabilityCard({ key_ }: Props) {
  return (
    <section aria-labelledby="dispo-heading" className="space-y-3">
      <h2 id="dispo-heading" className="text-lg font-semibold text-foreground">
        Disponibilité estimée
      </h2>
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <CalendarCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="text-lg font-semibold text-foreground">{availabilityLabel(key_)}</div>
          <div className="text-xs text-muted-foreground">
            Estimation basée sur l'agenda récent de l'entreprise.
          </div>
        </div>
      </div>
    </section>
  );
}

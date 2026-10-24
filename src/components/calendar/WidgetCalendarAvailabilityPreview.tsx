/**
 * Availability is never inferred from the current date or mocked.
 * Real appointment times are provided by the booking engine only after a
 * selected calendar has been synchronized and working hours configured.
 */
import { Clock } from "lucide-react";

export default function WidgetCalendarAvailabilityPreview({ role }: { role: string }) {
  return (
    <div className="rounded-xl border border-border/30 bg-card/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">
          {role === "contractor" ? "Disponibilités à configurer" : "Disponibilités à confirmer"}
        </h4>
      </div>
      <p className="text-sm text-muted-foreground" role="status">
        Aucune plage n'est affichée sans horaire professionnel réel, calendrier
        explicitement sélectionné et vérification des conflits.
      </p>
    </div>
  );
}

/**
 * UNPRO — Stage checklist for a single contractor journey.
 */
import { Check, X } from "lucide-react";
import type { JourneyStateRow } from "@/hooks/useContractorJourney";

const STEPS: { key: keyof JourneyStateRow; label: string }[] = [
  { key: "has_sms_sent", label: "SMS envoyé" },
  { key: "has_sms_delivered", label: "SMS livré" },
  { key: "has_clicked", label: "Lien cliqué" },
  { key: "has_landing_view", label: "Landing vue" },
  { key: "has_registration_started", label: "Inscription commencée" },
  { key: "has_step_company", label: "Info entreprise" },
  { key: "has_step_services", label: "Services" },
  { key: "has_step_territories", label: "Territoires" },
  { key: "has_step_pricing", label: "Tarification vue" },
  { key: "has_registration_completed", label: "Inscription complétée" },
  { key: "has_checkout_started", label: "Checkout créé" },
  { key: "has_checkout_opened", label: "Checkout ouvert" },
  { key: "has_paid", label: "Paiement réussi" },
  { key: "has_activated", label: "Activé" },
];

export default function StageChecklist({ state }: { state: JourneyStateRow }) {
  return (
    <div className="rounded-xl border border-border/20 bg-card/30 backdrop-blur-sm p-4">
      <h3 className="text-sm font-semibold mb-3">Étape actuelle</h3>
      <ul className="space-y-1.5">
        {STEPS.map((s) => {
          const done = Boolean(state[s.key]);
          return (
            <li key={s.key as string} className="flex items-center gap-2 text-sm">
              {done ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <X className="w-4 h-4 text-muted-foreground/50 shrink-0" />
              )}
              <span className={done ? "" : "text-muted-foreground"}>{s.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

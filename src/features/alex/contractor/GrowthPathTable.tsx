/**
 * GrowthPathTable — Steps to grow: profile, calendar, plan activation.
 */
import { useContractorStore } from "./contractorStore";

export default function GrowthPathTable() {
  const profile = useContractorStore((s) => s.profile);
  const completion = profile?.profile_completion ?? 0;

  const rows = [
    {
      step: "Compléter profil",
      current: `${completion}%`,
      target: "90%",
      action: "Logo, photos, services, villes",
      impact: "+12 AIPP",
      done: completion >= 90,
    },
    {
      step: "Connecter calendrier",
      current: "Non connecté",
      target: "Synchronisé",
      action: "Google Calendar",
      impact: "+8 AIPP",
      done: false,
    },
    {
      step: "Activer plan",
      current: "Inactif",
      target: "Premium",
      action: "Paiement Stripe",
      impact: "Accès rendez-vous",
      done: false,
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-4 space-y-2">
      <p className="text-sm font-semibold text-foreground">Comment y arriver</p>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="rounded-xl border border-border bg-background/40 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{r.step}</span>
              <span className="text-[10px] text-primary font-semibold">{r.impact}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
              <span>{r.current}</span>
              <span>→</span>
              <span className="text-foreground">{r.target}</span>
              <span className="ml-auto italic">{r.action}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

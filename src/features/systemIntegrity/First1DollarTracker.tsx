/**
 * First1DollarTracker — Progress ledger to first paying contractor.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Circle } from "lucide-react";
import { formatQcDateTime } from "@/lib/time/timezone";
import type { FirstPaidFunnel } from "./useSystemIntegrity";

const STEPS: Array<{ key: keyof FirstPaidFunnel; label: string }> = [
  { key: "prospect_identified_at", label: "Prospect identifié" },
  { key: "sms_delivered_at", label: "SMS livré" },
  { key: "clicked_at", label: "Clic" },
  { key: "account_created_at", label: "Compte créé" },
  { key: "payment_at", label: "Paiement 1 $" },
  { key: "activated_at", label: "Profil activé" },
  { key: "first_match_at", label: "Première demande compatible" },
  { key: "first_booking_at", label: "Premier rendez-vous" },
];

export function First1DollarTracker({ funnel }: { funnel: FirstPaidFunnel | undefined }) {
  const firstBlockingIdx = STEPS.findIndex((s) => !funnel?.[s.key]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Objectif — Premier entrepreneur payant</span>
          <span className="text-xs font-normal text-muted-foreground">
            {STEPS.filter((s) => funnel?.[s.key]).length} / {STEPS.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {STEPS.map((s, i) => {
            const ts = funnel?.[s.key];
            const done = !!ts;
            const isBlocking = !done && i === firstBlockingIdx;
            return (
              <li key={s.key} className={`flex items-start gap-3 ${isBlocking ? "ring-2 ring-amber-500/40 rounded-md p-2 -m-2 bg-amber-500/5" : ""}`}>
                {done ? (
                  <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className={`h-5 w-5 shrink-0 mt-0.5 ${isBlocking ? "text-amber-500" : "text-muted-foreground"}`} />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                    {isBlocking && <span className="ml-2 text-xs text-amber-500">← étape bloquante</span>}
                  </p>
                  {done && ts && (
                    <p className="text-xs text-muted-foreground tabular-nums">{formatQcDateTime(ts)}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";

interface TimelineEvent {
  step: string;
  status: "completed" | "current" | "pending" | "failed";
  timestamp?: string;
  detail?: string;
}

interface Props {
  events?: TimelineEvent[];
}

const defaultEvents: TimelineEvent[] = [
  { step: "Prospect importé", status: "completed", timestamp: "Il y a 2h", detail: "Via recherche GMB" },
  { step: "Entreprise matchée", status: "completed", timestamp: "Il y a 2h", detail: "Confiance: 92%" },
  { step: "Enrichissement complété", status: "completed", timestamp: "Il y a 1h45", detail: "NEQ détecté" },
  { step: "Email envoyé", status: "completed", timestamp: "Il y a 1h30", detail: "Séquence #1" },
  { step: "Prospect engagé", status: "completed", timestamp: "Il y a 45min", detail: "Lien ouvert" },
  { step: "Plan sélectionné", status: "current", detail: "Premium — en attente" },
  { step: "Paiement", status: "pending" },
  { step: "Activation", status: "pending" },
];

const statusIcons = {
  completed: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  current: <Clock className="h-4 w-4 text-primary animate-pulse" />,
  pending: <Circle className="h-4 w-4 text-muted-foreground/40" />,
  failed: <XCircle className="h-4 w-4 text-red-400" />,
};

export default function TimelineContractorActivationFlow({ events = defaultEvents }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Parcours d'activation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {events.map((event, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                {statusIcons[event.status]}
                {i < events.length - 1 && (
                  <div className={`w-px flex-1 min-h-[20px] ${
                    event.status === "completed" ? "bg-emerald-400/30" : "bg-muted/20"
                  }`} />
                )}
              </div>
              <div className="pb-4">
                <p className={`text-xs font-medium ${
                  event.status === "pending" ? "text-muted-foreground/50" : "text-foreground"
                }`}>
                  {event.step}
                </p>
                {event.detail && (
                  <p className="text-[10px] text-muted-foreground">{event.detail}</p>
                )}
                {event.timestamp && (
                  <p className="text-[9px] text-muted-foreground/60">{event.timestamp}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

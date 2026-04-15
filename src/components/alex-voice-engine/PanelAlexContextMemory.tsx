import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useContextSessions } from "@/hooks/useAlexVoiceEngine";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, Clock } from "lucide-react";

const statusColor: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  awaiting_address: "bg-amber-500/20 text-amber-400",
  awaiting_photo: "bg-amber-500/20 text-amber-400",
  awaiting_quote: "bg-amber-500/20 text-amber-400",
  recommending: "bg-blue-500/20 text-blue-400",
  booking: "bg-purple-500/20 text-purple-400",
  completed: "bg-muted text-muted-foreground",
  reset: "bg-red-500/20 text-red-400",
};

export default function PanelAlexContextMemory() {
  const { data: sessions = [], isLoading } = useContextSessions(20);

  if (isLoading) return <Skeleton className="h-60" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          Mémoire contextuelle — Sessions récentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune session enregistrée.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sessions.map((s: any) => (
              <div key={s.id} className="p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`text-xs ${statusColor[s.conversation_status] ?? "bg-muted"}`}>
                    {s.conversation_status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{s.language_mode}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(s.started_at).toLocaleString("fr-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {s.primary_problem && <div><span className="text-muted-foreground">Problème: </span>{s.primary_problem}</div>}
                  {s.city && <div><span className="text-muted-foreground">Ville: </span>{s.city}</div>}
                  {s.property_type && <div><span className="text-muted-foreground">Type: </span>{s.property_type}</div>}
                  {s.urgency_level && <div><span className="text-muted-foreground">Urgence: </span>{s.urgency_level}</div>}
                  {s.last_recommended_trade && <div><span className="text-muted-foreground">Métier: </span>{s.last_recommended_trade}</div>}
                  {s.booking_intent && <div><span className="text-muted-foreground">RDV: </span>✅</div>}
                </div>
                {s.last_question_asked && (
                  <p className="text-xs text-muted-foreground mt-1 italic">Dernière question: {s.last_question_asked}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

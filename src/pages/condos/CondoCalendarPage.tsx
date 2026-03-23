/**
 * UNPRO Condos — Calendar Page
 */
import CondoLayout from "@/layouts/CondoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Wrench, Vote, FileText, AlertTriangle } from "lucide-react";

const mockEvents = [
  { id: "1", title: "Inspection toiture", date: "15 avril 2026", type: "maintenance", icon: Wrench },
  { id: "2", title: "Assemblée générale annuelle", date: "22 avril 2026", type: "governance", icon: Vote },
  { id: "3", title: "Nettoyage gouttières", date: "1 mai 2026", type: "maintenance", icon: Wrench },
  { id: "4", title: "Remise rapport fonds prévoyance", date: "15 mai 2026", type: "document", icon: FileText },
  { id: "5", title: "Vérification extincteurs", date: "15 juin 2026", type: "safety", icon: AlertTriangle },
  { id: "6", title: "Ouverture piscine", date: "20 juin 2026", type: "maintenance", icon: Wrench },
];

const typeColors: Record<string, string> = {
  maintenance: "bg-primary/10 text-primary",
  governance: "bg-amber-500/10 text-amber-500",
  document: "bg-secondary/10 text-secondary",
  safety: "bg-destructive/10 text-destructive",
};

export default function CondoCalendarPage() {
  return (
    <CondoLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Calendrier</h1>
          <p className="text-sm text-muted-foreground mt-1">Événements et échéances à venir</p>
        </div>

        <div className="space-y-3">
          {mockEvents.map((event) => (
            <Card key={event.id} className="border-border/30">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${typeColors[event.type] || typeColors.maintenance}`}>
                  <event.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-foreground">{event.title}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Calendar className="h-3 w-3" />
                    {event.date}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </CondoLayout>
  );
}

import { Mail, Eye, MousePointer, MessageSquare, Zap, CheckCircle, AlertTriangle } from "lucide-react";

const iconMap: Record<string, any> = {
  email_sent: Mail,
  opened: Eye,
  clicked: MousePointer,
  replied: MessageSquare,
  alex_triggered: Zap,
  converted: CheckCircle,
  error: AlertTriangle,
  adjustment: Zap,
};

const colorMap: Record<string, string> = {
  email_sent: "text-blue-400",
  opened: "text-cyan-400",
  clicked: "text-amber-400",
  replied: "text-purple-400",
  alex_triggered: "text-orange-400",
  converted: "text-emerald-400",
  error: "text-red-400",
  adjustment: "text-yellow-400",
};

const labelMap: Record<string, string> = {
  email_sent: "Email envoyé",
  opened: "Email ouvert",
  clicked: "Lien cliqué",
  replied: "Réponse reçue",
  alex_triggered: "Alex intervient",
  converted: "Conversion!",
  error: "Erreur",
  adjustment: "Ajustement",
};

interface StrikeEvent {
  id: string;
  type: string;
  metadata: any;
  created_at: string;
}

export default function FeedLiveRecruitmentEvents({ events }: { events: StrikeEvent[] }) {
  if (!events.length) {
    return <div className="text-center py-8 text-muted-foreground text-sm">En attente d'événements…</div>;
  }

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto">
      {events.map((e) => {
        const Icon = iconMap[e.type] ?? Zap;
        const color = colorMap[e.type] ?? "text-muted-foreground";
        const label = labelMap[e.type] ?? e.type;
        const time = new Date(e.created_at).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

        return (
          <div key={e.id} className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/30 transition-colors">
            <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
            <span className="text-xs font-medium text-foreground flex-1">{label}</span>
            <span className="text-[10px] text-muted-foreground font-mono">{time}</span>
          </div>
        );
      })}
    </div>
  );
}

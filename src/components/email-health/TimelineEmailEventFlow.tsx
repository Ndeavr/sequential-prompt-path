/**
 * UNPRO — Email Event Flow Timeline
 */
import { Mail, Send, Inbox, Eye, MousePointerClick, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface EventItem {
  id: string;
  event_type: string;
  event_at: string;
  recipient_email?: string;
  provider_name?: string;
}

interface Props {
  events: EventItem[];
}

const EVENT_CONFIG: Record<string, { icon: typeof Mail; color: string; label: string }> = {
  queued: { icon: Mail, color: "text-muted-foreground", label: "En file" },
  sent: { icon: Send, color: "text-blue-500", label: "Envoyé" },
  delivered: { icon: Inbox, color: "text-emerald-500", label: "Livré" },
  opened: { icon: Eye, color: "text-purple-500", label: "Ouvert" },
  clicked: { icon: MousePointerClick, color: "text-primary", label: "Cliqué" },
  bounced: { icon: AlertTriangle, color: "text-destructive", label: "Rebondi" },
  complained: { icon: AlertTriangle, color: "text-orange-500", label: "Plainte" },
  failed: { icon: AlertTriangle, color: "text-destructive", label: "Échoué" },
};

const TimelineEmailEventFlow = ({ events }: Props) => {
  if (!events.length) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        Aucun événement d'envoi enregistré.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((e, i) => {
        const cfg = EVENT_CONFIG[e.event_type] || EVENT_CONFIG.queued;
        const Icon = cfg.icon;
        return (
          <div key={e.id} className="flex items-start gap-3 py-2">
            <div className="flex flex-col items-center">
              <div className={`p-1.5 rounded-full bg-card border border-border/30`}>
                <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
              </div>
              {i < events.length - 1 && <div className="w-px h-6 bg-border/30" />}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <p className="text-sm font-medium text-foreground">{cfg.label}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(e.event_at), "d MMM HH:mm:ss", { locale: fr })}
                {e.recipient_email && ` · ${e.recipient_email}`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TimelineEmailEventFlow;

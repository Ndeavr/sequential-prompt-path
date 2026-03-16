import { AlertTriangle, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AutomationAlert } from "@/services/automationService";

const icons = { info: Info, warning: AlertTriangle, critical: AlertCircle };
const colors = { info: "text-blue-500", warning: "text-amber-500", critical: "text-destructive" };
const bgColors = { info: "bg-blue-500/5 border-blue-500/20", warning: "bg-amber-500/5 border-amber-500/20", critical: "bg-destructive/5 border-destructive/20" };

interface Props {
  alerts: AutomationAlert[];
  onMarkRead: (id: string) => void;
}

export default function AutomationAlertsList({ alerts, onMarkRead }: Props) {
  if (alerts.length === 0) {
    return <p className="text-center text-muted-foreground text-sm py-8">Aucune alerte</p>;
  }
  return (
    <div className="space-y-2">
      {alerts.map(a => {
        const Icon = icons[a.level] ?? Info;
        return (
          <div key={a.id} className={`flex items-start gap-3 p-3 rounded-xl border ${bgColors[a.level] ?? ""} ${a.is_read ? "opacity-50" : ""}`}>
            <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${colors[a.level] ?? ""}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{a.title}</p>
              {a.message && <p className="text-xs text-muted-foreground mt-0.5">{a.message}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">{a.source} · {new Date(a.created_at).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" })}</p>
            </div>
            {!a.is_read && (
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => onMarkRead(a.id)}>
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

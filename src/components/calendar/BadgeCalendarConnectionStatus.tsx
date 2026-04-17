/**
 * BadgeCalendarConnectionStatus — status pill (idle / connected / failed / etc.)
 */
import { CheckCircle2, AlertCircle, Loader2, Calendar, X } from "lucide-react";
import type { CalendarStatus } from "@/hooks/useCalendarConnection";

export default function BadgeCalendarConnectionStatus({ status }: { status: CalendarStatus }) {
  const map = {
    idle:                { icon: Calendar, text: "Non connecté", cls: "bg-muted/40 text-muted-foreground" },
    connecting:          { icon: Loader2, text: "Connexion…",   cls: "bg-primary/10 text-primary animate-pulse" },
    connected:           { icon: CheckCircle2, text: "Connecté", cls: "bg-emerald-500/15 text-emerald-400" },
    subscribed_external: { icon: CheckCircle2, text: "Abonné Apple", cls: "bg-blue-500/15 text-blue-400" },
    failed:              { icon: AlertCircle, text: "Échec", cls: "bg-destructive/15 text-destructive" },
    revoked:             { icon: X, text: "Révoqué", cls: "bg-muted/40 text-muted-foreground" },
  } as const;
  const item = map[status] ?? map.idle;
  const Icon = item.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${item.cls}`}>
      <Icon className={`h-3.5 w-3.5 ${status === "connecting" ? "animate-spin" : ""}`} />
      {item.text}
    </span>
  );
}

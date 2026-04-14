import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send } from "lucide-react";
import { useSendingHealth } from "@/hooks/useOutboundProspects";

export default function WidgetDailySendVolume() {
  const { data } = useSendingHealth();
  const totalToday = data?.mailboxes?.reduce((s: number, m: any) => s + (m.sent_today ?? 0), 0) ?? 0;
  const totalLimit = data?.mailboxes?.reduce((s: number, m: any) => s + (m.daily_limit ?? 0), 0) ?? 0;
  const pct = totalLimit > 0 ? Math.round((totalToday / totalLimit) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />
          Volume d'envoi aujourd'hui
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{totalToday} <span className="text-sm font-normal text-muted-foreground">/ {totalLimit}</span></div>
        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{pct}% de la capacité utilisée</p>
      </CardContent>
    </Card>
  );
}

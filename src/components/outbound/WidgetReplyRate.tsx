import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import { useSendingHealth } from "@/hooks/useOutboundProspects";

export default function WidgetReplyRate() {
  const { data } = useSendingHealth();
  const sent = data?.totalSent7d ?? 0;
  const replied = data?.replied ?? 0;
  const opened = data?.opened ?? 0;
  const bounced = data?.bounced ?? 0;

  const replyRate = sent > 0 ? ((replied / sent) * 100).toFixed(1) : "0";
  const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : "0";
  const bounceRate = sent > 0 ? ((bounced / sent) * 100).toFixed(1) : "0";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Performance 7 jours
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-bold">{openRate}%</div>
            <div className="text-xs text-muted-foreground">Ouvert</div>
          </div>
          <div>
            <div className="text-lg font-bold text-primary">{replyRate}%</div>
            <div className="text-xs text-muted-foreground">Répondu</div>
          </div>
          <div>
            <div className="text-lg font-bold text-destructive">{bounceRate}%</div>
            <div className="text-xs text-muted-foreground">Bounce</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">{sent} emails envoyés</p>
      </CardContent>
    </Card>
  );
}

import { useSendingHealth } from "@/hooks/useOutboundProspects";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Server } from "lucide-react";

function statusBadge(status: string) {
  if (status === "active" || status === "warm") return <Badge className="bg-green-500/20 text-green-600 text-xs">{status}</Badge>;
  if (status === "warming") return <Badge className="bg-yellow-500/20 text-yellow-600 text-xs">{status}</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

export default function PanelSendingHealth() {
  const { data, isLoading } = useSendingHealth();

  if (isLoading) return <div className="text-xs text-muted-foreground animate-pulse">Chargement…</div>;

  const mailboxes = data?.mailboxes ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Server className="w-4 h-4 text-primary" />
          Santé des boîtes d'envoi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {mailboxes.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune boîte configurée</p>
        ) : (
          mailboxes.map((mb: any) => (
            <div key={mb.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-1.5">
              <span className="text-xs truncate max-w-[180px]">{mb.sender_email}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {mb.sent_today ?? 0}/{mb.daily_limit ?? 0}
                </span>
                {statusBadge(mb.mailbox_status ?? "unknown")}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OutboundMessage {
  id: string;
  channel: string;
  subject: string;
  delivery_status: string;
  sent_at: string | null;
}

export default function TableOutboundEmailRuns() {
  const [messages, setMessages] = useState<OutboundMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("outbound_messages")
        .select("id, channel, subject, delivery_status, sent_at")
        .order("sent_at", { ascending: false })
        .limit(50);
      setMessages((data as any[]) || []);
      setLoading(false);
    })();
  }, []);

  const statusIcon = (status: string) => {
    switch (status) {
      case "delivered": case "sent": return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
      case "failed": case "bounced": return <XCircle className="h-3.5 w-3.5 text-destructive" />;
      default: return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Emails envoyés
          <Badge variant="outline" className="ml-auto text-xs">{messages.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Aucun email envoyé</p>
        ) : (
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {messages.map((msg) => (
              <div key={msg.id} className="flex items-center gap-2 text-xs p-2 rounded border border-border/40">
                {statusIcon(msg.delivery_status)}
                <span className="flex-1 truncate text-foreground">{msg.subject || "Sans objet"}</span>
                <span className="text-muted-foreground shrink-0">
                  {msg.sent_at ? new Date(msg.sent_at).toLocaleDateString("fr-CA") : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

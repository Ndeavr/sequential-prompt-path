import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Check, X } from "lucide-react";
import WidgetEmailStateBadge from "./WidgetEmailStateBadge";

interface EmailMessage {
  id: string;
  subject?: string;
  preheader?: string;
  body_html?: string;
  body_text?: string;
  approval_status: string;
  send_status: string;
}

export default function PanelEmailGeneration({
  message,
  onApprove,
  onReject,
}: {
  message: EmailMessage | null;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  if (!message) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />Courriel</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">En attente de génération…</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          Courriel personnalisé
          <WidgetEmailStateBadge status={message.approval_status} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground">Objet</p>
          <p className="text-sm font-medium">{message.subject || "—"}</p>
        </div>
        {message.preheader && (
          <div>
            <p className="text-xs text-muted-foreground">Preheader</p>
            <p className="text-sm">{message.preheader}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Aperçu</p>
          <div className="rounded-lg bg-muted/30 border border-border p-3 text-sm max-h-48 overflow-y-auto whitespace-pre-wrap">
            {message.body_text || "Aucun contenu"}
          </div>
        </div>
        {message.approval_status === "pending" && (
          <div className="flex gap-2">
            <Button size="sm" onClick={onApprove} className="gap-1 flex-1">
              <Check className="h-3 w-3" /> Approuver
            </Button>
            <Button size="sm" variant="outline" onClick={onReject} className="gap-1 flex-1">
              <X className="h-3 w-3" /> Rejeter
            </Button>
          </div>
        )}
        <WidgetEmailStateBadge status={message.send_status} />
      </CardContent>
    </Card>
  );
}

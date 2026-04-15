import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Globe, Send, Check } from "lucide-react";

interface EmailSequence {
  id: string;
  etape: number;
  sujet: string;
  contenu: string;
  langue: string;
  statut: string;
  ouvert: boolean | null;
  clique: boolean | null;
  repondu: boolean | null;
}

const statusMap: Record<string, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  approuve: { label: "Approuvé", className: "bg-blue-500/20 text-blue-400" },
  envoye: { label: "Envoyé", className: "bg-emerald-500/20 text-emerald-400" },
  echoue: { label: "Échoué", className: "bg-red-500/20 text-red-400" },
};

export default function PanelPreviewEmailDynamique({
  emails,
  onToggleLangue,
  onSend,
}: {
  emails: EmailSequence[];
  onToggleLangue?: (id: string, newLang: string) => void;
  onSend?: (id: string) => void;
}) {
  const [viewLang, setViewLang] = useState<"fr" | "en">("fr");

  if (emails.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-primary" />Emails</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucun email généré pour ce prospect.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-primary" />
            Séquence Emails ({emails.length})
          </CardTitle>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={viewLang === "fr" ? "default" : "outline"}
              className="text-xs h-7 px-2"
              onClick={() => setViewLang("fr")}
            >
              🇫🇷 FR
            </Button>
            <Button
              size="sm"
              variant={viewLang === "en" ? "default" : "outline"}
              className="text-xs h-7 px-2"
              onClick={() => setViewLang("en")}
            >
              🇬🇧 EN
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {emails.map((email) => {
          const s = statusMap[email.statut] || statusMap.brouillon;
          const showEmail = email.langue === viewLang;

          return (
            <div key={email.id} className={`border border-border/50 rounded-lg p-3 transition-all ${showEmail ? "opacity-100" : "opacity-40"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Étape {email.etape}</span>
                  <Badge variant="outline" className={`text-[10px] ${s.className}`}>{s.label}</Badge>
                  <Badge variant="outline" className="text-[10px]">
                    <Globe className="h-2.5 w-2.5 mr-1" />
                    {email.langue.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  {email.ouvert && <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400"><Check className="h-2 w-2 mr-0.5" />Ouvert</Badge>}
                  {email.clique && <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400"><Check className="h-2 w-2 mr-0.5" />Cliqué</Badge>}
                </div>
              </div>
              <p className="text-sm font-medium text-foreground mb-1">{email.sujet}</p>
              {showEmail && (
                <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 max-h-32 overflow-y-auto" dangerouslySetInnerHTML={{ __html: email.contenu }} />
              )}
              {!showEmail && (
                <p className="text-xs text-muted-foreground italic">
                  {viewLang === "en" ? "View in English" : "Voir en français"} — cet email est en {email.langue === "fr" ? "français" : "anglais"}
                </p>
              )}
              {email.statut === "brouillon" && onSend && (
                <Button size="sm" className="mt-2 text-xs h-7" onClick={() => onSend(email.id)}>
                  <Send className="h-3 w-3 mr-1" />Envoyer
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

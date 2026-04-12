import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, AlertCircle, Phone, ArrowRight } from "lucide-react";
import { useUnopenedEmailFlags, useSmsMessages } from "@/hooks/useOutboundEliteData";

const SMS_SEQUENCE = [
  { step: 1, delay: "J+0", body: "{{FirstName}}, savez-vous combien de clients vous manquent en ligne? Votre score AIPP révèle tout. Répondez OUI pour le voir.", tone: "Curiosité" },
  { step: 2, delay: "J+2", body: "Votre score AIPP est prêt. Il montre exactement où vous perdez des clients. On vous l'envoie?", tone: "AIPP" },
  { step: 3, delay: "J+5", body: "Vous laissez environ {{monthly_loss}}$/mois sur la table. 15 min pour comprendre pourquoi.", tone: "Argent" },
  { step: 4, delay: "J+8", body: "Dernière chance de voir votre score AIPP gratuit. Répondez AIPP ou STOP.", tone: "CTA Final" },
];

export default function PageOutboundSMSFallback() {
  const { data: flagged, isLoading: flaggedLoading } = useUnopenedEmailFlags();
  const { data: messages, isLoading: messagesLoading } = useSmsMessages();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <MessageSquare className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">SMS Fallback Engine</h1>
          <p className="text-sm text-muted-foreground">Transformer les non-ouvertures email en opportunités SMS</p>
        </div>
      </div>

      {/* Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Règles de déclenchement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              { label: "Emails non ouverts", value: "≥ 2" },
              { label: "Délai minimum", value: "48h" },
              { label: "Numéro requis", value: "Oui" },
              { label: "Max SMS", value: "3–4" },
            ].map((r) => (
              <div key={r.label} className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="font-bold text-primary">{r.value}</div>
                <div className="text-xs text-muted-foreground">{r.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              <strong>Stop automatique</strong> si réponse reçue ou si le prospect répond STOP. Conformité SMS stricte.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SMS Sequence Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Séquence SMS AIPP</CardTitle>
          <CardDescription>4 SMS max — court, humain, actionnable</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {SMS_SEQUENCE.map((sms, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {sms.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{sms.delay}</Badge>
                    <Badge variant="secondary" className="text-xs">{sms.tone}</Badge>
                  </div>
                  <p className="text-sm">{sms.body}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Flagged Prospects */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prospects flaggés pour SMS</CardTitle>
          <CardDescription>Emails non ouverts — éligibles SMS fallback</CardDescription>
        </CardHeader>
        <CardContent>
          {flaggedLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Chargement…</p>
          ) : !flagged?.length ? (
            <p className="text-sm text-muted-foreground">Aucun prospect flaggé pour SMS.</p>
          ) : (
            <div className="space-y-2">
              {flagged.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-mono">{f.prospect_id?.slice(0, 8)}…</p>
                    <p className="text-xs text-muted-foreground">{f.email_count_unopened} non ouverts sur {f.email_count_sent}</p>
                  </div>
                  <Badge variant={f.sms_sent ? "default" : "secondary"}>
                    {f.sms_sent ? "SMS envoyé" : "En attente"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent SMS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Derniers SMS envoyés</CardTitle>
        </CardHeader>
        <CardContent>
          {messagesLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Chargement…</p>
          ) : !messages?.length ? (
            <p className="text-sm text-muted-foreground">Aucun SMS envoyé.</p>
          ) : (
            <div className="space-y-2">
              {messages.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm">{m.message_body?.slice(0, 60)}…</p>
                    <p className="text-xs text-muted-foreground">{m.phone_number} · Étape {m.step_order}</p>
                  </div>
                  <Badge variant={m.status === "sent" ? "default" : m.status === "failed" ? "destructive" : "secondary"}>
                    {m.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

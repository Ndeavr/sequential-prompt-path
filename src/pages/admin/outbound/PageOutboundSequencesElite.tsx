import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Plus, ArrowRight } from "lucide-react";
import { useEmailSequences } from "@/hooks/useOutboundEliteData";

const AIPP_SEQUENCE_PREVIEW = [
  { step: 1, delay: "J+0", subject: "{{FirstName}}, petite question", body: "Savez-vous combien de clients vous perdez en ligne en ce moment?", tone: "Curiosité" },
  { step: 2, delay: "J+2", subject: "Ce n'est pas un problème de trafic", body: "C'est souvent un problème de lisibilité pour l'IA.", tone: "Insight" },
  { step: 3, delay: "J+4", subject: "Votre score AIPP", body: "Votre score AIPP mesure exactement ça. Souhaitez-vous le voir?", tone: "AIPP" },
  { step: 4, delay: "J+7", subject: "Argent laissé sur la table", body: "Vous laissez probablement de l'argent sur la table.", tone: "Argent" },
  { step: 5, delay: "J+10", subject: "On regarde ça ensemble?", body: "15 minutes, sans engagement. On regarde vos chiffres.", tone: "CTA" },
  { step: 6, delay: "J+14", subject: "Je ferme votre dossier", body: "Répondez AIPP si vous voulez voir votre score.", tone: "Break-up" },
];

export default function PageOutboundSequencesElite() {
  const { data: sequences, isLoading } = useEmailSequences();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      {/* Hero */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AIPP Cold Email Sequences</h1>
            <p className="text-sm text-muted-foreground">Séquences optimisées conversion — ton humain, 0 spam</p>
          </div>
        </div>
      </div>

      {/* Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Règles de séquence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              { label: "Plain-text", value: "Obligatoire" },
              { label: "Liens", value: "0–1 max" },
              { label: "Images", value: "Aucune" },
              { label: "Ton", value: "Humain" },
            ].map((r) => (
              <div key={r.label} className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="font-medium">{r.value}</div>
                <div className="text-xs text-muted-foreground">{r.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AIPP Preview Sequence */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Séquence AIPP Standard</CardTitle>
            <CardDescription>6 étapes — 14 jours — conversion-first</CardDescription>
          </div>
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" /> Dupliquer
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {AIPP_SEQUENCE_PREVIEW.map((step, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {step.step}
                  </div>
                  {i < AIPP_SEQUENCE_PREVIEW.length - 1 && (
                    <div className="w-px h-4 bg-border mt-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{step.delay}</Badge>
                    <Badge variant="secondary" className="text-xs">{step.tone}</Badge>
                  </div>
                  <p className="text-sm font-medium truncate">{step.subject}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{step.body}</p>
                </div>
                <Button size="icon" variant="ghost" className="shrink-0">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Existing sequences from DB */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Séquences enregistrées</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Chargement…</p>
          ) : !sequences?.length ? (
            <p className="text-sm text-muted-foreground">Aucune séquence enregistrée. Créez votre première séquence AIPP.</p>
          ) : (
            <div className="space-y-2">
              {sequences.map((seq: any) => (
                <div key={seq.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{seq.sequence_label}</p>
                    <p className="text-xs text-muted-foreground">{seq.step_count} étapes · {seq.language}</p>
                  </div>
                  <Badge variant={seq.status === "active" ? "default" : "secondary"}>{seq.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

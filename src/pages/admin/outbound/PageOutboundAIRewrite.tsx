import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, User, Building, MapPin } from "lucide-react";
import { useEmailPersonalizations } from "@/hooks/useOutboundEliteData";

const EXAMPLE_BEFORE = `Bonjour,

Nous offrons un service d'analyse de visibilité en ligne. Souhaitez-vous en savoir plus?`;

const EXAMPLE_AFTER = `Bonjour Marc,

Je suis tombé sur votre entreprise à Laval. Il y a un point intéressant : certaines informations ne sont pas bien interprétées par l'IA. C'est souvent là que des clients se perdent.

Votre score AIPP est de 42/100. On regarde ça ensemble?`;

export default function PageOutboundAIRewrite() {
  const { data: personalizations, isLoading } = useEmailPersonalizations();

  return (
    <AdminLayout>
      <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Email Personalization</h1>
          <p className="text-sm text-muted-foreground">Chaque email unique, humain, personnalisé par l'IA</p>
        </div>
      </div>

      {/* Before / After */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Avant / Après AI Rewrite</CardTitle>
          <CardDescription>L'IA personnalise chaque email avec le prénom, la ville, le service et le score AIPP</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5">
              <Badge variant="outline" className="mb-2 text-red-600 border-red-300">Avant</Badge>
              <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground">{EXAMPLE_BEFORE}</pre>
            </div>
            <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/5">
              <Badge variant="outline" className="mb-2 text-green-600 border-green-300">Après AI</Badge>
              <pre className="text-sm whitespace-pre-wrap font-sans">{EXAMPLE_AFTER}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personalization Signals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signaux de Personnalisation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: User, label: "FirstName", desc: "Prénom du prospect", score: "+25" },
              { icon: MapPin, label: "Ville", desc: "Localisation ciblée", score: "+20" },
              { icon: Building, label: "Service", desc: "Spécialité métier", score: "+20" },
              { icon: Sparkles, label: "AIPP Score", desc: "Score réel intégré", score: "+35" },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-lg border bg-card text-center">
                <s.icon className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
                <Badge variant="secondary" className="mt-1 text-xs">{s.score} pts</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Score Calculation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score de Personnalisation</CardTitle>
          <CardDescription>0–100 basé sur les signaux détectés</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="font-bold text-red-600">0–40</p>
              <p className="text-xs text-muted-foreground">Générique</p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="font-bold text-yellow-600">41–70</p>
              <p className="text-xs text-muted-foreground">Personnalisé</p>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="font-bold text-green-600">71–100</p>
              <p className="text-xs text-muted-foreground">Hyper-personnalisé</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Rewrites */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dernières personnalisations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Chargement…</p>
          ) : !personalizations?.length ? (
            <p className="text-sm text-muted-foreground">Aucune personnalisation IA encore générée.</p>
          ) : (
            <div className="space-y-2">
              {personalizations.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{p.first_name || "—"} · {p.company_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{p.city} · AIPP: {p.aipp_score ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{p.personalization_score}/100</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  </AdminLayout>
  );
}

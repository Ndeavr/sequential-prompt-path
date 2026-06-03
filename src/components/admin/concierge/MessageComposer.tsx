/**
 * UNPRO — Concierge message composer.
 * 3 templates (opener / reply / close) auto-filled with prospect variables.
 * Output: copy-to-clipboard + open-in-SMS/email deep link + log as touch.
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Copy, MessageSquare, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { ConciergeTarget } from "@/hooks/useConcierge";
import { useLogTouch } from "@/hooks/useConcierge";
import { supabase } from "@/integrations/supabase/client";

const TEMPLATES = {
  opener: (p: Vars) =>
`${p.firstName}, question rapide.

Quand les propriétaires demandent à l'IA quelle est la meilleure entreprise de ${p.trade} à ${p.city}…
est-ce que ${p.company} apparaît en premier?

On a analysé votre structure de visibilité.
Fort sur les avis (${p.reviews}★), mais faible en positionnement IA.

UNPRO ouvre des activations limitées dans votre territoire.

On vous montre votre score?`,

  reply: (p: Vars) =>
`La plupart des entrepreneurs optimisent encore pour Google.
Les propriétaires se déplacent vers les recommandations IA.

UNPRO positionne ${p.company} pour devenir:
— lisible par l'IA
— sémantiquement crédible
— dominant géographiquement
— prêt pour la recommandation

Plus: rendez-vous exclusifs basés sur votre territoire et vos objectifs.
Pas des leads partagés.`,

  close: (p: Vars) =>
`${p.firstName}, vous êtes un excellent fit pour votre territoire.

On peut activer:
— votre structure de visibilité IA
— votre profil de recommandation propriétaire
— votre positionnement sémantique
— le routage de rendez-vous
— votre score de confiance
— l'intelligence territoriale

Activation en 24–48h. On n'onboarde qu'un nombre limité par territoire/métier.

Je vous réserve votre activation maintenant?`,
};

type Vars = { firstName: string; company: string; city: string; trade: string; reviews: number };

function buildVars(p: ConciergeTarget): Vars {
  const firstName = p.owner_name?.split(" ")[0] || "Bonjour";
  return {
    firstName,
    company: p.business_name,
    city: p.city || "votre ville",
    trade: p.trade || p.category_slug || "votre métier",
    reviews: p.review_count || 0,
  };
}

export default function MessageComposer({ prospect }: { prospect: ConciergeTarget }) {
  const [tab, setTab] = useState<"opener" | "reply" | "close">("opener");
  const vars = useMemo(() => buildVars(prospect), [prospect]);
  const [text, setText] = useState<string>(() => TEMPLATES[tab](vars));
  const [aiBusy, setAiBusy] = useState(false);
  const logTouch = useLogTouch();

  const regen = (next: "opener" | "reply" | "close") => {
    setTab(next);
    setText(TEMPLATES[next](vars));
  };

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    toast.success("Message copié");
  };

  const log = async (channel: "sms" | "email" | "call" | "note") => {
    await logTouch.mutateAsync({
      prospect_id: prospect.id,
      channel,
      direction: "out",
      body: text,
    });
    toast.success("Touche journalisée");
  };

  const smsLink = prospect.phone ? `sms:${prospect.phone}?&body=${encodeURIComponent(text)}` : undefined;
  const mailLink = prospect.email
    ? `mailto:${prospect.email}?subject=${encodeURIComponent(`${prospect.business_name} · visibilité IA`)}&body=${encodeURIComponent(text)}`
    : undefined;

  const personalize = async () => {
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("concierge-generate-message", {
        body: { prospect_id: prospect.id, template: tab, base_text: text },
      });
      if (error) throw error;
      if (data?.text) setText(data.text);
      toast.success("Message personnalisé par IA");
    } catch (e: any) {
      toast.error(e.message || "Échec de la personnalisation");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <Tabs value={tab} onValueChange={(v) => regen(v as any)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="opener">Ouverture</TabsTrigger>
          <TabsTrigger value="reply">Suivi</TabsTrigger>
          <TabsTrigger value="close">Fermeture</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            className="font-mono text-xs leading-relaxed"
          />
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={copy}>
          <Copy className="h-3.5 w-3.5 mr-1.5" /> Copier
        </Button>
        <Button size="sm" variant="outline" onClick={personalize} disabled={aiBusy}>
          <Sparkles className="h-3.5 w-3.5 mr-1.5" /> {aiBusy ? "…" : "Personnaliser IA"}
        </Button>
        {smsLink && (
          <Button size="sm" variant="outline" asChild onClick={() => log("sms")}>
            <a href={smsLink}><MessageSquare className="h-3.5 w-3.5 mr-1.5" /> SMS</a>
          </Button>
        )}
        {mailLink && (
          <Button size="sm" variant="outline" asChild onClick={() => log("email")}>
            <a href={mailLink}><Mail className="h-3.5 w-3.5 mr-1.5" /> Courriel</a>
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => log("note")}>
          Journaliser
        </Button>
      </div>
    </div>
  );
}

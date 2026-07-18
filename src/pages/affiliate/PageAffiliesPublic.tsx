/**
 * PageAffiliesPublic — Page publique du programme d'affiliation UNPRO.
 * Route: /affilies
 */
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Briefcase,
  Home,
  Handshake,
  Sparkles,
  ShieldCheck,
  Trophy,
} from "lucide-react";

const STEPS = [
  { n: 1, t: "Activez", d: "60 secondes, sans nouveau compte." },
  { n: 2, t: "Recommandez", d: "Votre lien perso ou une carte d'affaires." },
  { n: 3, t: "Suivez", d: "Pipeline en temps réel dans votre tableau de bord." },
  { n: 4, t: "Encaissez", d: "Commissions dès la conversion validée." },
];

const PROFILES = [
  {
    icon: Briefcase,
    kind: "contractor" as const,
    title: "Entrepreneur",
    desc: "Vous connaissez des pros qui gagneraient à rejoindre UNPRO ? Recommandez-les.",
  },
  {
    icon: Home,
    kind: "homeowner" as const,
    title: "Propriétaire",
    desc: "Recommandez UNPRO à un voisin, une famille, un syndicat de copropriété.",
  },
  {
    icon: Handshake,
    kind: "partner" as const,
    title: "Partenaire / Créateur",
    desc: "Vous avez une audience ou un réseau ? Devenez ambassadeur UNPRO.",
  },
];

const FAQ = [
  {
    q: "Combien puis-je gagner ?",
    a: "Les commissions sont configurées par plan et validées après la période d'essai. Vous voyez le montant estimé avant chaque recommandation.",
  },
  {
    q: "Dois-je créer un nouveau compte ?",
    a: "Non. Si vous êtes déjà connecté comme propriétaire ou entrepreneur, votre statut d'affilié s'ajoute à votre compte existant.",
  },
  {
    q: "Comment fonctionne l'attribution ?",
    a: "Chaque lien contient votre code. Toute recommandation qui s'active dans la fenêtre d'attribution vous est créditée automatiquement.",
  },
  {
    q: "Puis-je recommander sans lien ?",
    a: "Oui. Depuis votre tableau de bord, ajoutez un prospect (saisie rapide, photo de carte d'affaires, import ou site web).",
  },
  {
    q: "Quand suis-je payé ?",
    a: "Les commissions passent au statut « validée » après la fenêtre de validation, puis sont réglées selon vos préférences de paiement.",
  },
  {
    q: "Puis-je m'auto-recommander ?",
    a: "Non. Les auto-références et les doublons sont bloqués automatiquement.",
  },
  {
    q: "Est-ce que ça respecte le C-28 ?",
    a: "Oui. Chaque recommandation vérifie le consentement du prospect à être contacté par UNPRO.",
  },
  {
    q: "Je suis déjà affilié ?",
    a: "Retrouvez votre tableau de bord directement à /affiliate.",
  },
];

export default function PageAffiliesPublic() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Programme d'affiliation UNPRO — Recommandez et gagnez</title>
        <meta
          name="description"
          content="Rejoignez le programme d'affiliation UNPRO. Recommandez des entrepreneurs ou des propriétaires et gagnez des commissions validées, en toute transparence."
        />
        <link rel="canonical" href="https://unpro.ca/affilies" />
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-5xl px-6 pt-20 pb-14 md:pt-28 md:pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Programme officiel UNPRO
          </div>
          <h1 className="mt-6 text-4xl md:text-6xl font-semibold tracking-tight text-foreground">
            Recommandez UNPRO.
            <br />
            <span className="text-primary">Encaissez des commissions.</span>
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-lg text-muted-foreground">
            Le programme d'affiliation UNPRO récompense chaque personne qui aide un
            entrepreneur ou un propriétaire à rejoindre la plateforme.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="text-base">
              <Link to="/affilies/activer">
                Devenir affilié
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base">
              <Link to="/affiliate">Déjà affilié ? Mon tableau de bord</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {STEPS.map((s) => (
            <Card key={s.n} className="border-border/60 bg-card/40 backdrop-blur">
              <CardContent className="p-5">
                <div className="text-xs font-medium text-primary">Étape {s.n}</div>
                <div className="mt-2 text-lg font-semibold text-foreground">{s.t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.d}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Profiles */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground text-center">
          Qui peut devenir affilié ?
        </h2>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {PROFILES.map(({ icon: Icon, kind, title, desc }) => (
            <Card
              key={kind}
              className="border-border/60 bg-card/40 backdrop-blur hover:border-primary/40 transition-colors"
            >
              <CardContent className="p-6 flex flex-col h-full">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground flex-1">{desc}</p>
                <Button asChild variant="ghost" className="mt-4 justify-start px-0">
                  <Link to={`/affilies/activer?type=${kind}`}>
                    Commencer <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { i: ShieldCheck, t: "Transparent", d: "Taux et fenêtres visibles avant chaque recommandation." },
            { i: Trophy, t: "Validation honnête", d: "Aucun crédit fantôme. Commissions basées sur des activations réelles." },
            { i: Sparkles, t: "Sans friction", d: "Ajoutez un prospect par photo, lien ou saisie rapide." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-foreground">{t}</div>
                <div className="text-sm text-muted-foreground">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <h2 className="text-2xl md:text-3xl font-semibold text-foreground text-center">
          Questions fréquentes
        </h2>
        <div className="mt-8 space-y-3">
          {FAQ.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border border-border/60 bg-card/40 backdrop-blur p-4"
            >
              <summary className="cursor-pointer font-medium text-foreground list-none flex items-center justify-between">
                {f.q}
                <ArrowRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform" />
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button asChild size="lg">
            <Link to="/affilies/activer">
              Activer mon statut d'affilié
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

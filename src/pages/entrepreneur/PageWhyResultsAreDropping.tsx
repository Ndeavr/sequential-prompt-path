/**
 * UNPRO — Landing: "Pourquoi vos résultats chutent"
 * AI Trust Layer narrative landing driving to /entrepreneur/ai-trust-audit
 */
import { useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Brain,
  Target,
  ShieldCheck,
  MapPin,
  Lock,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

function trackCta(key: string, section: string) {
  supabase
    .from("entrepreneur_cta_events")
    .insert({
      visitor_id: crypto.randomUUID(),
      cta_key: key,
      page_section: section,
    })
    .then(() => {});
}

export default function PageWhyResultsAreDropping() {
  const navigate = useNavigate();

  const goAudit = useCallback(
    (section: string) => {
      trackCta("analyze_my_business", section);
      navigate("/entrepreneur/ai-trust-audit");
    },
    [navigate],
  );

  const goTerritory = useCallback(
    (section: string) => {
      trackCta("territory_availability", section);
      navigate("/entrepreneur/ai-trust-audit?intent=territory");
    },
    [navigate],
  );

  return (
    <>
      <Helmet>
        <title>Pourquoi vos résultats chutent | UNPRO AI Trust Layer</title>
        <meta
          name="description"
          content="Google, Facebook et SEO génèrent moins de contrats. L'IA change la façon dont les propriétaires choisissent leur entrepreneur. Découvrez ce que ChatGPT, Gemini et Google AI comprennent réellement de votre entreprise."
        />
        <link rel="canonical" href="https://www.unpro.ca/entrepreneur/pourquoi-vos-resultats-chutent" />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
          <div className="relative max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary mb-6"
            >
              <Sparkles className="w-3 h-3" /> UNPRO AI Trust Layer
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-3xl md:text-5xl font-bold leading-tight font-display mb-6"
            >
              Découvrez pourquoi vos campagnes Google, Facebook et SEO génèrent{" "}
              <span className="text-primary">moins de contrats</span> qu'avant.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto mb-4"
            >
              L'IA transforme silencieusement la façon dont les propriétaires trouvent et choisissent leurs entrepreneurs.
            </motion.p>

            <div className="text-sm text-muted-foreground max-w-xl mx-auto mb-10 space-y-1">
              <p>Même avec des campagnes actives, un bon SEO, des avis Google et un beau site web…</p>
              <p className="text-foreground font-medium">les moteurs IA peuvent ne plus recommander votre entreprise.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                className="gap-2 text-base px-8 py-6"
                onClick={() => goAudit("hero")}
              >
                Analyser mon entreprise <ArrowRight className="w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-base px-8 py-6"
                onClick={() => goTerritory("hero")}
              >
                <MapPin className="w-4 h-4" /> Voir si mon territoire est encore disponible
              </Button>
            </div>

            <p className="mt-8 text-xs text-muted-foreground">
              Analyse gratuite. Aucune carte requise.
            </p>
          </div>
        </section>

        {/* LE PROBLÈME */}
        <section className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-widest text-primary mb-2">Le marché a changé</p>
            <h2 className="text-2xl md:text-4xl font-bold font-display">
              Avant, Google affichait des liens. Aujourd'hui, l'IA répond directement.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-10">
            <div className="p-6 rounded-2xl border border-border/50 bg-card/30">
              <p className="text-xs text-muted-foreground mb-2">AVANT</p>
              <p className="font-medium">Le client cherchait. Google listait. Vous étiez visible.</p>
            </div>
            <div className="p-6 rounded-2xl border border-primary/30 bg-primary/5">
              <p className="text-xs text-primary mb-2">AUJOURD'HUI</p>
              <p className="font-medium">ChatGPT, Gemini, Perplexity et Google AI <span className="text-primary">recommandent un seul nom</span>.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="font-semibold">L'IA peut nuire à votre entreprise sans que vous le sachiez&nbsp;:</p>
            </div>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground pl-8 list-disc">
              <li>mal comprendre votre spécialité</li>
              <li>favoriser vos compétiteurs</li>
              <li>ignorer votre territoire</li>
              <li>manquer vos services</li>
              <li>mal interpréter vos avis</li>
              <li>vous classer dans la mauvaise catégorie</li>
            </ul>
            <p className="mt-5 text-sm font-medium">
              Résultat&nbsp;: moins d'appels. Moins de soumissions. Moins de contrats. Même si vos campagnes tournent encore.
            </p>
          </div>
        </section>

        {/* EXEMPLE RÉEL */}
        <section className="bg-card/30 border-y border-border/40">
          <div className="max-w-4xl mx-auto px-4 py-16">
            <p className="text-xs uppercase tracking-widest text-primary mb-2 text-center">Exemple détecté par UNPRO</p>
            <h2 className="text-2xl md:text-3xl font-bold font-display text-center mb-10">
              Isolation Solution Royal
            </h2>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
                <p className="text-xs text-primary mb-3">CE QUE L'ENTREPRISE EST RÉELLEMENT</p>
                <ul className="space-y-2 text-sm">
                  {["Spécialiste isolation d'entretoit", "Ventilation", "Décontamination", "Efficacité énergétique"].map(
                    (t) => (
                      <li key={t} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> {t}
                      </li>
                    ),
                  )}
                </ul>
              </div>
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
                <p className="text-xs text-destructive mb-3">CE QUE L'IA CROYAIT</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-destructive shrink-0" /> Entrepreneur général
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground mt-4">
                  Conséquence&nbsp;: moins recommandée sur isolation d'entretoit, ventilation, barrages de glace, humidité, efficacité énergétique.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CE QUE UNPRO ANALYSE — 4 LAYERS */}
        <section className="max-w-5xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-primary mb-2">Ce que UNPRO analyse</p>
            <h2 className="text-2xl md:text-4xl font-bold font-display">4 couches d'intelligence</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                icon: Brain,
                label: "Layer 1 — AI Trust",
                items: [
                  "ChatGPT recommande votre entreprise?",
                  "Gemini comprend votre spécialité?",
                  "Perplexity vous cite?",
                  "Google AI vous associe aux bons services?",
                ],
              },
              {
                icon: Target,
                label: "Layer 2 — Specialization Clarity",
                items: [
                  "Ce que vous faites vraiment",
                  "Où vous êtes fort",
                  "Dans quelle ville vous dominez",
                  "Pourquoi vous êtes différent",
                ],
              },
              {
                icon: ShieldCheck,
                label: "Layer 3 — Homeowner Trust Signals",
                items: [
                  "Avis et signaux de confiance",
                  "Cohérence de votre présence web",
                  "Failles de perception",
                  "Problèmes récurrents mentionnés",
                ],
              },
              {
                icon: MapPin,
                label: "Layer 4 — Territory Authority",
                items: [
                  "Laval, Terrebonne, Blainville",
                  "Lanaudière, Montréal",
                  "Vos compétiteurs prennent-ils l'espace IA?",
                  "Cartographie de votre autorité",
                ],
              },
            ].map(({ icon: Icon, label, items }) => (
              <div key={label} className="rounded-2xl border border-border/50 bg-card/30 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{label}</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {items.map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="text-primary mt-1">·</span> {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* LE BON / LE MAUVAIS / LE LAID */}
        <section className="bg-card/30 border-y border-border/40">
          <div className="max-w-5xl mx-auto px-4 py-16">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-4xl font-bold font-display">Le bon · Le mauvais · Le laid</h2>
              <p className="text-muted-foreground mt-2">Une analyse honnête, sans filtre marketing.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
                <p className="text-xs text-primary mb-2">LE BON</p>
                <p className="font-medium">Ce que les clients aiment réellement chez vous.</p>
              </div>
              <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-6">
                <p className="text-xs text-yellow-500 mb-2">LE MAUVAIS</p>
                <p className="font-medium">Les signaux faibles qui nuisent à votre positionnement.</p>
              </div>
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
                <p className="text-xs text-destructive mb-2">LE LAID</p>
                <p className="font-medium">Ce que l'IA comprend mal de votre entreprise.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CE QUE LES AUTRES NE VOIENT PAS */}
        <section className="max-w-3xl mx-auto px-4 py-16 text-center">
          <Eye className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-2xl md:text-4xl font-bold font-display mb-4">Le SEO traditionnel ne suffit plus.</h2>
          <div className="space-y-3 text-lg">
            <p className="text-muted-foreground">Le futur n'est plus&nbsp;:</p>
            <p className="line-through text-muted-foreground">"Qui rank?"</p>
            <p className="text-foreground font-semibold">Le futur devient&nbsp;: "Qui l'IA recommande?"</p>
          </div>
        </section>

        {/* POSITIONNEMENT UNPRO */}
        <section className="bg-card/30 border-y border-border/40">
          <div className="max-w-4xl mx-auto px-4 py-16">
            <h2 className="text-2xl md:text-4xl font-bold font-display text-center mb-10">UNPRO n'est pas ce que vous pensez.</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border/50 bg-background/40 p-6">
                <p className="text-xs uppercase tracking-widest text-destructive mb-3">UNPRO ne vend pas</p>
                <ul className="space-y-2 text-sm">
                  {["Du SEO", "Des clics", "Des leads partagés"].map((t) => (
                    <li key={t} className="flex items-center gap-2 text-muted-foreground">
                      <XCircle className="w-4 h-4 text-destructive shrink-0" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
                <p className="text-xs uppercase tracking-widest text-primary mb-3">UNPRO construit</p>
                <ul className="space-y-2 text-sm">
                  {[
                    "Votre couche de confiance IA",
                    "Votre autorité territoriale",
                    "Votre structure sémantique",
                    "Votre intelligence entrepreneuriale",
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-center text-lg mt-8 font-medium">
              Objectif&nbsp;: devenir l'entreprise que les IA <span className="text-primary">recommandent naturellement</span>.
            </p>
          </div>
        </section>

        {/* RARETÉ */}
        <section className="max-w-4xl mx-auto px-4 py-16">
          <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-8 md:p-12">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold font-display">Places limitées par métier et territoire.</h2>
                <p className="text-muted-foreground mt-2">UNPRO limite volontairement le nombre d'entrepreneurs par spécialité, par territoire et par cluster.</p>
              </div>
            </div>
            <p className="text-sm">
              Parce que nous optimisons des <span className="text-primary font-semibold">rendez-vous exclusifs</span>. Pas des leads partagés.
            </p>
            <div className="mt-6">
              <Button onClick={() => goTerritory("scarcity")} variant="outline" className="gap-2">
                <MapPin className="w-4 h-4" /> Vérifier la disponibilité de mon territoire
              </Button>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl md:text-4xl font-bold font-display mb-4">
            Découvrez ce que l'IA croit réellement de votre entreprise.
          </h2>
          <p className="text-muted-foreground mb-8">
            Analyse complète des 4 couches en moins de 2 minutes.
          </p>
          <Button size="lg" onClick={() => goAudit("final")} className="gap-2 text-base px-8 py-6">
            Analyser mon entreprise <ArrowRight className="w-5 h-5" />
          </Button>
          <p className="mt-6 text-xs text-muted-foreground">
            Analyse gratuite. Aucune carte requise.
          </p>
        </section>
      </div>
    </>
  );
}

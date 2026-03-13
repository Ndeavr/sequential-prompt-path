/**
 * UNPRO Condos — Fonds de prévoyance SEO Page
 */
import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  PiggyBank, TrendingUp, AlertTriangle, ArrowRight, Building2,
  Calculator, ChevronDown, BarChart3, Shield
} from "lucide-react";

const faqs = [
  { q: "Qu'est-ce qu'un fonds de prévoyance?", a: "C'est un fonds constitué par les contributions des copropriétaires, destiné à couvrir les réparations majeures et le remplacement des parties communes (toiture, fenêtres, ascenseur, etc.)." },
  { q: "Comment est-il calculé?", a: "L'étude du fonds de prévoyance, réalisée par un professionnel, évalue les coûts de remplacement de chaque composante et recommande des cotisations annuelles adéquates." },
  { q: "Que se passe-t-il si le fonds est insuffisant?", a: "Le syndicat devra imposer une cotisation spéciale aux copropriétaires, parfois de plusieurs milliers de dollars par unité, pour couvrir les travaux urgents." },
  { q: "UNPRO peut-il remplacer l'étude d'un ingénieur?", a: "Non. UNPRO Condos est un outil de suivi et de projection. L'étude officielle doit être réalisée par un professionnel qualifié. UNPRO vous aide à suivre les recommandations et visualiser les projections." },
];

const CondoFondsPage = () => (
  <MainLayout>
    <section className="py-16 sm:py-24 bg-gradient-to-b from-success/5 via-background to-background">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <Badge className="mb-5 bg-success/10 text-success border-success/20">
          <PiggyBank className="h-3.5 w-3.5 mr-1.5" /> Planification financière
        </Badge>
        <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight mb-5">
          Fonds de prévoyance de copropriété
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Visualisez, projetez et optimisez votre fonds de prévoyance pour éviter les cotisations spéciales surprises.
        </p>
        <Button asChild size="lg" className="rounded-xl shadow-glow">
          <Link to="/condos/onboarding"><Building2 className="h-5 w-5 mr-2" /> Simuler mes projections</Link>
        </Button>
      </div>
    </section>

    <section className="py-16 bg-background">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="font-display text-2xl font-bold mb-6">Comprendre le fonds de prévoyance</h2>
        <div className="text-sm text-muted-foreground space-y-4 max-w-3xl">
          <p>Le fonds de prévoyance est l'assurance financière de votre copropriété contre les travaux majeurs. Un fonds bien géré protège les copropriétaires contre les cotisations spéciales imprévues qui peuvent atteindre des dizaines de milliers de dollars par unité.</p>
          <p>La Loi 16 exige que chaque syndicat obtienne une étude professionnelle de son fonds de prévoyance. UNPRO Condos vous aide à suivre les recommandations et projeter vos besoins sur 25 ans.</p>
        </div>
      </div>
    </section>

    <section className="py-16 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="font-display text-2xl font-bold mb-8 text-center">Ce que UNPRO Condos offre</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: BarChart3, title: "Projections sur 25 ans", desc: "Visualisez l'évolution de votre fonds avec graphiques interactifs" },
            { icon: Calculator, title: "Simulateur de cotisations", desc: "Calculez l'impact des ajustements de cotisations par unité" },
            { icon: AlertTriangle, title: "Alertes de sous-capitalisation", desc: "Détection automatique quand le fonds est insuffisant" },
          ].map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Card className="h-full border-border/40 bg-card/90">
                <CardContent className="p-5 text-center">
                  <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-3">
                    <f.icon className="h-5 w-5 text-success" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <section className="py-16 bg-background">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="font-display text-2xl font-bold text-center mb-8">Questions fréquentes</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <details key={i} className="group">
              <summary className="flex items-center justify-between p-4 rounded-xl bg-card/80 border border-border/40 cursor-pointer">
                <span className="font-medium text-sm pr-4">{faq.q}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform flex-shrink-0" />
              </summary>
              <div className="px-4 pb-4 pt-2 text-sm text-muted-foreground leading-relaxed">{faq.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>

    <section className="py-16 bg-gradient-to-b from-background to-primary/5 text-center">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="font-display text-2xl font-bold mb-4">Protégez votre fonds de prévoyance</h2>
        <p className="text-muted-foreground mb-6">Créez votre Passeport Immeuble et accédez aux projections financières.</p>
        <Button asChild size="lg" className="rounded-xl shadow-glow">
          <Link to="/condos/onboarding">Commencer gratuitement <ArrowRight className="h-4 w-4 ml-2" /></Link>
        </Button>
      </div>
    </section>
  </MainLayout>
);

export default CondoFondsPage;

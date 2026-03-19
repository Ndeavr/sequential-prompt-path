/**
 * UNPRO — Courtiers Landing Page
 * Broker acquisition funnel: hero, value props, AIPP, sector availability, FAQ, CTA.
 */
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, Users, MapPin, Shield, Star, BarChart3,
  CheckCircle, ArrowRight, Zap, Target, Award, Building2
} from "lucide-react";
import { motion } from "framer-motion";
import MainLayout from "@/layouts/MainLayout";
import { Helmet } from "react-helmet-async";
import BrokerQualificationModal from "@/components/broker/BrokerQualificationModal";
import { useState } from "react";

const VALUE_PROPS = [
  { icon: Target, title: "Leads qualifiés", desc: "Propriétaires pré-qualifiés par IA, prêts à vendre ou acheter." },
  { icon: MapPin, title: "Territoires exclusifs", desc: "Nombre limité de courtiers par zone pour maximiser votre ROI." },
  { icon: BarChart3, title: "Score AIPP", desc: "Votre performance mesurée et visible. Plus vous performez, plus vous recevez." },
  { icon: Shield, title: "Profil vérifié", desc: "Badge de confiance, licence vérifiée, avis authentiques." },
];

const PLANS = [
  { name: "Pro", price: "149", leads: "5-10/mois", zones: 3, highlight: false },
  { name: "Premium", price: "299", leads: "10-20/mois", zones: 8, highlight: true },
  { name: "Élite", price: "499", leads: "20-40/mois", zones: 15, highlight: false },
  { name: "Signature", price: "Sur mesure", leads: "Illimité", zones: 50, highlight: false },
];

const FAQ = [
  { q: "Comment les leads sont-ils qualifiés?", a: "Notre IA analyse l'intention, le budget, la timeline et le profil du propriétaire avant de vous l'envoyer. Score de sérieux minimum de 60/100." },
  { q: "Combien de courtiers par territoire?", a: "Maximum 3-5 selon la taille du marché. Nous limitons strictement pour garantir la qualité." },
  { q: "Puis-je choisir mes zones?", a: "Oui, vous sélectionnez vos zones lors de l'inscription. La disponibilité est vérifiée en temps réel." },
  { q: "Qu'est-ce que le score AIPP?", a: "Un score de 0 à 100 mesurant votre réactivité, taux de conversion, avis clients et complétude de profil. Il influence votre rang dans les résultats." },
  { q: "Y a-t-il un engagement?", a: "Non, tous les plans sont mensuels sans engagement. Vous pouvez annuler à tout moment." },
];

export default function CourtiersLandingPage() {
  const [showModal, setShowModal] = useState(false);

  return (
    <MainLayout>
      <Helmet>
        <title>Courtiers immobiliers — Recevez des leads qualifiés | UNPRO</title>
        <meta name="description" content="Rejoignez UNPRO pour recevoir des propriétaires qualifiés dans votre territoire exclusif. Score AIPP, profil vérifié, leads pré-qualifiés par IA." />
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              <Building2 className="h-3 w-3 mr-1" /> Places limitées par territoire
            </Badge>
            <h1 className="text-3xl md:text-5xl font-black text-foreground leading-tight mb-4">
              Recevez des propriétaires<br />
              <span className="text-primary">qualifiés par IA</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              UNPRO connecte les courtiers immobiliers aux propriétaires prêts à agir.
              Territoire exclusif, leads vérifiés, performance mesurée.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={() => setShowModal(true)} className="text-base">
                Vérifier ma disponibilité <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/pricing">Voir les plans</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Value Props */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-10">
          Pourquoi les courtiers choisissent UNPRO
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {VALUE_PROPS.map((p) => (
            <motion.div key={p.title} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Card className="h-full">
                <CardContent className="p-6 flex gap-4">
                  <div className="rounded-xl bg-primary/10 p-3 h-fit">
                    <p.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{p.title}</h3>
                    <p className="text-sm text-muted-foreground">{p.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-muted/30 py-16">
        <div className="max-w-5xl mx-auto px-5">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">Comment ça marche</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Créez votre profil", desc: "Licence, zones, spécialités, style. 5 minutes." },
              { step: "2", title: "Recevez des leads", desc: "Propriétaires qualifiés par IA dans votre territoire." },
              { step: "3", title: "Convertissez", desc: "Votre score AIPP monte, vous recevez plus de leads premium." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans Preview */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-10">Plans courtiers</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <Card key={plan.name} className={plan.highlight ? "border-primary shadow-lg ring-2 ring-primary/20" : ""}>
              <CardContent className="p-5 text-center">
                {plan.highlight && <Badge className="mb-2 bg-primary text-primary-foreground">Populaire</Badge>}
                <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                <p className="text-2xl font-black text-foreground mt-2">
                  {plan.price.startsWith("Sur") ? plan.price : `${plan.price}$`}
                  {!plan.price.startsWith("Sur") && <span className="text-sm font-normal text-muted-foreground">/mois</span>}
                </p>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 justify-center">
                    <CheckCircle className="h-3.5 w-3.5 text-primary" />
                    {plan.leads} leads
                  </div>
                  <div className="flex items-center gap-2 justify-center">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {plan.zones} zones
                  </div>
                </div>
                <Button variant={plan.highlight ? "default" : "outline"} size="sm" className="mt-4 w-full" onClick={() => setShowModal(true)}>
                  Commencer
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/30 py-16">
        <div className="max-w-3xl mx-auto px-5">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">Questions fréquentes</h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <Card key={f.q}>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-foreground mb-2">{f.q}</h3>
                  <p className="text-sm text-muted-foreground">{f.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Prêt à recevoir vos premiers leads?</h2>
          <p className="text-muted-foreground mb-6">Vérifiez la disponibilité dans votre secteur en 30 secondes.</p>
          <Button size="lg" onClick={() => setShowModal(true)}>
            Vérifier ma disponibilité <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <BrokerQualificationModal open={showModal} onOpenChange={setShowModal} />
    </MainLayout>
  );
}

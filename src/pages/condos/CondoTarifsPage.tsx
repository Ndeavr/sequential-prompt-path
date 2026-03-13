/**
 * UNPRO Condos — Tarifs / Pricing Page
 */
import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Building2, CheckCircle2, Zap, ArrowRight, ChevronDown, Crown
} from "lucide-react";

const pricingTiers = [
  { units: "2–4 unités", price: "150 $", perUnit: "~38 $ / unité" },
  { units: "5–10 unités", price: "300 $", perUnit: "~30 $ / unité" },
  { units: "11–20 unités", price: "500 $", perUnit: "~25 $ / unité" },
  { units: "21–50 unités", price: "750 $", perUnit: "~15 $ / unité" },
  { units: "51–100 unités", price: "1 000 $", perUnit: "~10 $ / unité" },
  { units: "101+ unités", price: "1 500 $", perUnit: "Meilleur rapport" },
];

const freeFeatures = [
  "Profil immeuble complet",
  "Inventaire des composantes",
  "Journal de maintenance",
  "Calendrier d'entretien",
  "Coffre-fort documents",
  "Registre du syndicat",
  "Administrateurs illimités",
  "Checklist Loi 16",
  "Exports de base",
];

const premiumFeatures = [
  "Tout le plan gratuit",
  "Score de santé immeuble",
  "Prévisions de maintenance IA",
  "Projections fonds de prévoyance 25 ans",
  "Analyse de soumissions IA",
  "Recherche intelligente documents",
  "Professionnels recommandés par UNPRO",
  "Rapports avancés & exports PDF",
  "Génération d'attestation",
  "Support prioritaire",
];

const faqs = [
  { q: "Les prix incluent-ils les taxes?", a: "Oui. Tous les prix affichés incluent la TPS et la TVQ. Vos factures détailleront le sous-total, les taxes et le total." },
  { q: "Puis-je commencer gratuitement?", a: "Absolument. Le plan Passeport Immeuble Gratuit est sans limite de durée et inclut toutes les fonctionnalités essentielles de gestion." },
  { q: "Comment fonctionne la facturation?", a: "Les abonnements Premium sont facturés annuellement. Vous recevez une facture détaillée conforme aux exigences fiscales du Québec." },
  { q: "Puis-je changer de plan?", a: "Oui. Vous pouvez passer au Premium à tout moment. Si votre nombre d'unités change, contactez-nous pour ajuster votre plan." },
  { q: "Y a-t-il un contrat à long terme?", a: "Non. L'abonnement est annuel et peut être annulé à la fin de la période. Vos données restent accessibles en mode gratuit." },
];

const CondoTarifsPage = () => (
  <MainLayout>
    <section className="py-16 sm:py-24 bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <Badge className="mb-5 bg-primary/10 text-primary border-primary/20">
          <Building2 className="h-3.5 w-3.5 mr-1.5" /> Tarification transparente
        </Badge>
        <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight mb-5">
          Tarifs UNPRO Condos
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Gratuit pour commencer. Premium pour l'intelligence avancée. Prix selon le nombre d'unités.
        </p>
      </div>
    </section>

    {/* Plans comparison */}
    <section className="py-16 bg-background">
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free */}
          <Card className="border-border/40 bg-card/90">
            <CardContent className="p-6">
              <h3 className="font-display font-bold text-lg mb-1">Passeport Immeuble</h3>
              <p className="text-3xl font-display font-bold text-foreground mb-1">Gratuit</p>
              <p className="text-xs text-muted-foreground mb-6">Pour toujours · Aucune carte requise</p>
              <div className="space-y-2.5">
                {freeFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                    <span className="text-sm">{f}</span>
                  </div>
                ))}
              </div>
              <Button asChild className="w-full mt-6 rounded-xl" variant="outline">
                <Link to="/condos/onboarding">Commencer gratuitement</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Premium */}
          <Card className="border-primary/30 bg-card/90 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-display font-bold text-lg">UNPRO Condos Premium</h3>
                <Crown className="h-4 w-4 text-warning" />
              </div>
              <p className="text-3xl font-display font-bold text-primary mb-1">À partir de 150 $</p>
              <p className="text-xs text-muted-foreground mb-6">Par année · Taxes incluses</p>
              <div className="space-y-2.5">
                {premiumFeatures.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm">{f}</span>
                  </div>
                ))}
              </div>
              <Button asChild className="w-full mt-6 rounded-xl shadow-glow">
                <Link to="/condos/onboarding">Passer au Premium <ArrowRight className="h-4 w-4 ml-2" /></Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>

    {/* Pricing by units */}
    <section className="py-16 bg-muted/30">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="font-display text-2xl font-bold text-center mb-8">Tarifs Premium par nombre d'unités</h2>
        <Card className="border-border/40 bg-card/90 overflow-hidden">
          <div className="divide-y divide-border/30">
            {pricingTiers.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
              >
                <div>
                  <span className="font-semibold text-sm">{t.units}</span>
                </div>
                <div className="text-right">
                  <span className="font-display font-bold text-lg text-primary">{t.price}</span>
                  <span className="text-xs text-muted-foreground ml-1.5">/ an</span>
                  <p className="text-xs text-muted-foreground">{t.perUnit}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
        <p className="text-xs text-muted-foreground text-center mt-3">Tous les prix incluent TPS + TVQ (14,975 %)</p>
      </div>
    </section>

    {/* FAQ */}
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
        <h2 className="font-display text-2xl font-bold mb-4">Prêt à commencer?</h2>
        <p className="text-muted-foreground mb-6">Créez votre Passeport Immeuble gratuit en moins de 5 minutes.</p>
        <Button asChild size="lg" className="rounded-xl shadow-glow">
          <Link to="/condos/onboarding"><Building2 className="h-5 w-5 mr-2" /> Créer mon Passeport Immeuble</Link>
        </Button>
      </div>
    </section>
  </MainLayout>
);

export default CondoTarifsPage;

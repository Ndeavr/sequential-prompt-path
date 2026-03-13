/**
 * UNPRO Condos — Carnet d'entretien SEO Page
 */
import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Wrench, CheckCircle2, ArrowRight, Building2, Calendar,
  FileText, Clock, ChevronDown, TrendingUp, AlertTriangle
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const sections = [
  { title: "Historique des travaux", desc: "Documentation complète de chaque intervention, incluant dates, coûts, entrepreneurs et résultats.", icon: Clock },
  { title: "Calendrier préventif", desc: "Planification automatique des entretiens récurrents basée sur la durée de vie des composantes.", icon: Calendar },
  { title: "Fiches composantes", desc: "Profil détaillé de chaque composante : installation, garantie, durée de vie restante.", icon: Wrench },
  { title: "Rapports et exports", desc: "Génération de rapports PDF pour les assemblées générales et les institutions financières.", icon: FileText },
];

const faqs = [
  { q: "Qu'est-ce qu'un carnet d'entretien de copropriété?", a: "C'est un document obligatoire qui recense toutes les interventions de maintenance effectuées sur les parties communes d'un immeuble en copropriété. Il inclut l'historique des travaux, les composantes du bâtiment et le calendrier d'entretien préventif." },
  { q: "Pourquoi est-ce obligatoire?", a: "La Loi 16 du Québec oblige tous les syndicats de copropriété à maintenir un carnet d'entretien à jour. C'est un outil essentiel pour planifier les travaux et protéger la valeur de l'immeuble." },
  { q: "Comment UNPRO remplace-t-il un carnet papier?", a: "UNPRO Condos numérise entièrement votre carnet d'entretien : suivi automatique, rappels, photos, documents joints, et rapports exportables. Plus besoin de classeurs physiques." },
  { q: "Puis-je importer mon historique existant?", a: "Oui. Vous pouvez ajouter manuellement vos entrées historiques et téléverser vos documents existants dans le coffre-fort numérique." },
];

const CondoCarnetPage = () => (
  <MainLayout>
    <section className="py-16 sm:py-24 bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <Badge className="mb-5 bg-primary/10 text-primary border-primary/20">
          <Wrench className="h-3.5 w-3.5 mr-1.5" /> Carnet d'entretien
        </Badge>
        <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight mb-5">
          Carnet d'entretien de copropriété
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Documentez, planifiez et suivez toute la maintenance de votre immeuble en un seul endroit numérique et sécurisé.
        </p>
        <Button asChild size="lg" className="rounded-xl shadow-glow">
          <Link to="/condos/onboarding"><Building2 className="h-5 w-5 mr-2" /> Créer mon carnet d'entretien</Link>
        </Button>
      </div>
    </section>

    <section className="py-16 bg-background">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">Pourquoi un carnet d'entretien est essentiel</h2>
        <div className="text-sm text-muted-foreground space-y-4 mb-10 max-w-3xl">
          <p>Un bâtiment bien entretenu conserve sa valeur et évite les surprises coûteuses. Le carnet d'entretien est la mémoire institutionnelle de votre copropriété — il survit aux changements d'administrateurs et assure la continuité de la gestion.</p>
          <p>Sans carnet structuré, les syndicats perdent la trace des interventions passées, manquent les entretiens préventifs et font face à des réparations d'urgence évitables.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {sections.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Card className="h-full border-border/40 bg-card/90">
                <CardContent className="p-5">
                  <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center mb-3">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-sm mb-1.5">{s.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <section className="py-16 bg-muted/30">
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
        <h2 className="font-display text-2xl font-bold mb-4">Numérisez votre carnet d'entretien</h2>
        <p className="text-muted-foreground mb-6">Passez du papier au numérique en moins de 5 minutes.</p>
        <Button asChild size="lg" className="rounded-xl shadow-glow">
          <Link to="/condos/onboarding">Commencer gratuitement <ArrowRight className="h-4 w-4 ml-2" /></Link>
        </Button>
      </div>
    </section>
  </MainLayout>
);

export default CondoCarnetPage;

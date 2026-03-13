/**
 * UNPRO Condos — Loi 16 SEO Landing Page
 */
import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Shield, CheckCircle2, AlertTriangle, ArrowRight, Building2,
  Calendar, FileText, PiggyBank, ChevronDown, Scale, Clock
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

const obligations = [
  { title: "Étude du fonds de prévoyance", desc: "Obtenir une étude réalisée par un professionnel qualifié pour évaluer les besoins financiers à long terme du bâtiment.", icon: PiggyBank, deadline: "Obligatoire" },
  { title: "Carnet d'entretien", desc: "Maintenir un carnet d'entretien détaillé documentant toutes les interventions sur les parties communes.", icon: FileText, deadline: "Continu" },
  { title: "Plan de gestion de l'actif", desc: "Établir un plan structuré pour la maintenance préventive et le remplacement des composantes majeures.", icon: Calendar, deadline: "Requis" },
  { title: "Registre de copropriété", desc: "Tenir à jour un registre contenant les documents constitutifs, procès-verbaux et états financiers.", icon: Scale, deadline: "Continu" },
];

const consequences = [
  "Amendes pouvant atteindre 15 000 $ par infraction",
  "Responsabilité personnelle des administrateurs",
  "Impossibilité de vendre les unités sans attestation",
  "Cotisations spéciales imprévues pour rattraper le retard",
  "Dégradation accélérée du bâtiment sans maintenance préventive",
];

const faqs = [
  { q: "À qui s'applique la Loi 16?", a: "À tous les syndicats de copropriété du Québec, peu importe la taille du bâtiment ou le nombre d'unités. Les syndicats existants et nouveaux sont tous assujettis." },
  { q: "Quelles sont les dates limites?", a: "Les obligations sont entrées en vigueur progressivement depuis 2020. L'étude du fonds de prévoyance et le carnet d'entretien doivent être maintenus de façon continue." },
  { q: "Qui est responsable de la conformité?", a: "Les administrateurs du syndicat sont personnellement responsables. La Loi prévoit des amendes en cas de non-conformité." },
  { q: "Combien coûte une mise en conformité?", a: "L'étude du fonds de prévoyance coûte entre 3 000 $ et 15 000 $ selon la taille de l'immeuble. UNPRO Condos réduit les coûts administratifs du suivi continu." },
  { q: "UNPRO Condos remplace-t-il un ingénieur?", a: "Non. UNPRO est un outil de gestion qui organise vos données et facilite le suivi. L'étude du fonds doit être réalisée par un professionnel qualifié (ingénieur ou technologue)." },
];

const CondoLoi16Page = () => (
  <MainLayout>
    {/* Hero */}
    <section className="relative py-16 sm:py-24 bg-gradient-to-b from-warning/5 via-background to-background">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.div variants={fadeUp} custom={0}>
            <Badge className="mb-5 bg-warning/10 text-warning border-warning/20">
              <Shield className="h-3.5 w-3.5 mr-1.5" /> Conformité légale
            </Badge>
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="font-display text-3xl sm:text-5xl font-bold tracking-tight mb-5">
            Loi 16 et copropriété au Québec
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Comprenez vos obligations légales en tant que syndicat de copropriété et assurez votre conformité avec UNPRO Condos.
          </motion.p>
          <motion.div variants={fadeUp} custom={3}>
            <Button asChild size="lg" className="rounded-xl">
              <Link to="/condos/onboarding">Vérifier ma conformité <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* What is Loi 16 */}
    <section className="py-16 bg-background">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-6">Qu'est-ce que la Loi 16?</h2>
        <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
          <p>La <strong>Loi 16</strong> (Loi visant principalement l'encadrement des inspections en bâtiment et de la copropriété divise) a été adoptée en 2019 par l'Assemblée nationale du Québec. Elle impose de nouvelles obligations aux syndicats de copropriété pour assurer la <strong>pérennité des immeubles</strong> et la <strong>protection des copropriétaires</strong>.</p>
          <p>Cette loi modernise le Code civil du Québec en matière de copropriété divise et vise à prévenir les situations où des immeubles se dégradent faute de maintenance adéquate, entraînant des cotisations spéciales importantes pour les copropriétaires.</p>
        </div>
      </div>
    </section>

    {/* Obligations */}
    <section className="py-16 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-8 text-center">Vos 4 obligations principales</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {obligations.map((o, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Card className="h-full border-border/40 bg-card/90">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center">
                      <o.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-sm">{o.title}</h3>
                      <Badge variant="outline" className="text-[10px] mt-0.5">{o.deadline}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{o.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Consequences */}
    <section className="py-16 bg-background">
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <Badge className="mb-4 bg-destructive/10 text-destructive border-destructive/20">
              <AlertTriangle className="h-3 w-3 mr-1" /> Risques
            </Badge>
            <h2 className="font-display text-2xl font-bold mb-4">Conséquences de la non-conformité</h2>
            <p className="text-sm text-muted-foreground mb-6">Ne pas se conformer à la Loi 16 expose les administrateurs et le syndicat à des sanctions importantes.</p>
          </div>
          <Card className="border-destructive/20 bg-destructive/3">
            <CardContent className="p-5 space-y-3">
              {consequences.map((c, i) => (
                <div key={i} className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{c}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>

    {/* How UNPRO helps */}
    <section className="py-16 bg-muted/30">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">Comment UNPRO Condos vous aide</h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-10">Notre plateforme automatise le suivi de vos obligations Loi 16.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: CheckCircle2, title: "Checklist interactive", desc: "Suivez votre progression vers la conformité complète" },
            { icon: Calendar, title: "Rappels automatiques", desc: "Notifications pour les échéances et renouvellements" },
            { icon: FileText, title: "Coffre-fort documents", desc: "Centralisez tous vos documents légaux en un seul endroit" },
          ].map((f, i) => (
            <Card key={i} className="border-border/40 bg-card/90">
              <CardContent className="p-5 text-center">
                <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-3">
                  <f.icon className="h-5 w-5 text-success" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>

    {/* FAQ */}
    <section className="py-16 bg-background">
      <div className="max-w-3xl mx-auto px-4">
        <h2 className="font-display text-2xl font-bold text-center mb-8">Questions fréquentes sur la Loi 16</h2>
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

    {/* CTA */}
    <section className="py-16 bg-gradient-to-b from-background to-primary/5">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">Assurez votre conformité Loi 16 dès maintenant</h2>
        <p className="text-muted-foreground mb-6">Créez votre Passeport Immeuble gratuit et obtenez immédiatement votre checklist de conformité.</p>
        <Button asChild size="lg" className="rounded-xl shadow-glow">
          <Link to="/condos/onboarding"><Building2 className="h-5 w-5 mr-2" /> Créer mon Passeport Immeuble</Link>
        </Button>
      </div>
    </section>
  </MainLayout>
);

export default CondoLoi16Page;

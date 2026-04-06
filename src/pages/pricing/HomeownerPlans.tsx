import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home, Sparkles, ArrowRight, FileSearch } from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FREE_FEATURES = [
  { text: "Créer un profil propriétaire", link: null },
  { text: "Créer un Passeport Maison", link: "/passeport-maison" },
  { text: "Décrire un projet", link: null },
  { text: "Recevoir un entrepreneur recommandé", link: null },
  { text: "Réserver un rendez-vous", link: null },
  { text: "Analyse intelligente des soumissions : 1 analyse incluse par mois", link: null },
];

const PLUS_FEATURES = [
  { text: "Tout le plan Gratuit", link: null },
  { text: "Passeport Maison complet", link: "/passeport-maison" },
  { text: "Analyses intelligentes des soumissions illimitées", link: null },
  { text: "Score maison UNPRO", link: "/score-maison" },
  { text: "Historique des travaux", link: null },
  { text: "Outils avancés de suivi et d'organisation", link: null },
];

function FeatureList({ features }: { features: { text: string; link: string | null }[] }) {
  return (
    <ul className="space-y-2.5">
      {features.map((f) => (
        <li key={f.text} className="flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
          {f.link ? (
            <Link to={f.link} className="text-sm text-foreground hover:text-primary transition-colors underline underline-offset-2 decoration-border hover:decoration-primary">
              {f.text}
            </Link>
          ) : (
            <span className="text-sm text-foreground">{f.text}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function HomeownerPlans() {
  return (
    <section className="px-5 py-16 md:py-20">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-primary/8 text-primary text-sm font-semibold mb-4">
            <Home className="h-3.5 w-3.5" /> Pour les propriétaires
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Toujours gratuit pour les propriétaires</h2>
          <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
            Trouvez le bon entrepreneur, comparez mieux, organisez vos projets et avancez sans frais cachés.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto">
          {/* Free */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="glass-card-elevated rounded-2xl p-6 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <Home className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="font-bold text-foreground">Gratuit</h3>
              </div>
              <div className="mb-5">
                <span className="text-4xl font-extrabold text-foreground">0 $</span>
                <span className="text-muted-foreground text-sm ml-1">pour toujours</span>
              </div>
              <FeatureList features={FREE_FEATURES} />
              <div className="mt-auto pt-6">
                <Button asChild variant="outline" size="lg" className="w-full rounded-xl">
                  <Link to="/signup">Créer mon compte <ArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Plus */}
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ delay: 0.1 }}>
            <div className="glass-card-elevated rounded-2xl p-6 h-full flex flex-col border-primary/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-foreground">Propriétaire Plus</h3>
              </div>
              <div className="mb-5">
                <span className="text-4xl font-extrabold text-foreground">49 $</span>
                <span className="text-muted-foreground text-sm ml-1">/ année</span>
              </div>
              <FeatureList features={PLUS_FEATURES} />
              <div className="mt-auto pt-6">
                <Button asChild size="lg" className="w-full rounded-xl shadow-glow">
                  <Link to="/signup">Passer à Plus <ArrowRight className="h-4 w-4 ml-1" /></Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Analyse intelligente des soumissions */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 max-w-2xl mx-auto"
        >
          <div className="rounded-2xl border border-border/50 bg-card/50 p-5 md:p-6">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileSearch className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h4 className="font-bold text-foreground text-sm mb-1">Analyse intelligente des soumissions</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Déposez jusqu'à 3 soumissions et UNPRO repère les écarts, les zones floues, les oublis possibles et les éléments à vérifier avant d'aller plus loin.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

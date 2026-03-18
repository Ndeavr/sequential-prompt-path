/**
 * UNPRO — Founder Page Content (background behind lock)
 * Premium landing page for founder program.
 */
import { motion } from "framer-motion";
import { Crown, Zap, Shield, Star, Users, Rocket } from "lucide-react";

const BENEFITS = [
  { icon: Crown, title: "Accès fondateur permanent", desc: "Aucun frais mensuel récurrent. Un paiement unique, un accès à vie." },
  { icon: Zap, title: "Recommandation Alex activée", desc: "L'IA d'UNPRO recommande votre entreprise en priorité aux propriétaires." },
  { icon: Shield, title: "Profil AIPP vérifié", desc: "Score de confiance certifié et badge fondateur sur votre profil public." },
  { icon: Star, title: "Visibilité maximale", desc: "Position premium dans les résultats de recherche et les recommandations." },
  { icon: Users, title: "Territoire exclusif", desc: "Réservez votre zone de service avant qu'elle ne soit complète." },
  { icon: Rocket, title: "Accès bêta", desc: "Premiers à tester les nouvelles fonctionnalités et outils IA." },
];

export default function FounderContent() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Hero */}
      <section className="pt-20 pb-16 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <Crown className="h-4 w-4" />
            Offre Fondateur — Places limitées
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
            Devenez un entrepreneur <span className="text-primary">fondateur</span> d'UNPRO
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Rejoignez le cercle restreint d'entrepreneurs qui façonnent l'avenir de la rénovation au Québec. 
            Accès à vie, visibilité maximale, recommandation IA prioritaire.
          </p>
        </motion.div>
      </section>

      {/* Benefits grid */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur p-6 space-y-3"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">{b.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing section */}
      <section className="pb-20 px-4">
        <div className="max-w-lg mx-auto text-center space-y-8">
          <h2 className="text-2xl font-bold text-foreground">Une offre exclusive</h2>
          <div className="rounded-3xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-8 space-y-4">
            <div className="text-5xl font-bold text-foreground">1 997 $</div>
            <p className="text-muted-foreground">Paiement unique · Accès fondateur permanent</p>
            <div className="pt-4 space-y-2 text-sm text-left max-w-xs mx-auto">
              {["Profil AIPP complet", "Recommandation Alex", "1 territoire inclus", "Badge Fondateur", "Support prioritaire"].map(f => (
                <div key={f} className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

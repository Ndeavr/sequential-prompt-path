import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

function ManifestoBlock({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

export default function PageManifesto() {
  return (
    <MainLayout>
      <Helmet>
        <title>Manifeste UNPRO — La fin des 3 soumissions</title>
        <meta name="description" content="Le monde des services est brisé. UNPRO élimine le bruit, remplace la comparaison par la précision. Bienvenue dans l'ère de la décision." />
        <link rel="canonical" href="https://unpro.ca/manifeste" />
      </Helmet>

      <article className="relative overflow-hidden">
        {/* Background aura */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[10%] left-[5%] w-[60vw] h-[60vw] rounded-full bg-primary/6 blur-[140px]" />
          <div className="absolute bottom-[20%] right-[5%] w-[40vw] h-[40vw] rounded-full bg-secondary/5 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-5 py-16 md:py-28">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-10">

            {/* Title */}
            <ManifestoBlock>
              <p className="text-xs uppercase tracking-[0.25em] text-primary font-medium mb-4">Manifeste</p>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1] font-display">
                MANIFESTE <span className="text-gradient">UNPRO</span>
              </h1>
            </ManifestoBlock>

            {/* Opening */}
            <ManifestoBlock className="space-y-4">
              <p className="text-xl md:text-2xl font-bold text-foreground leading-snug">
                Le monde des services est brisé.
              </p>
              <div className="space-y-1 text-muted-foreground text-base md:text-lg leading-relaxed">
                <p>Trop de bruit.</p>
                <p>Trop de comparaisons inutiles.</p>
                <p>Trop de temps perdu… des deux côtés.</p>
              </div>
            </ManifestoBlock>

            {/* 3 soumissions */}
            <ManifestoBlock className="space-y-4">
              <div className="space-y-1 text-muted-foreground text-base md:text-lg leading-relaxed">
                <p>On vous a appris à demander 3 soumissions.</p>
                <p>Comme si plus d'options signifiait une meilleure décision.</p>
                <p>Comme si le chaos créait de la clarté.</p>
              </div>
              <p className="text-foreground font-bold text-lg md:text-xl">C'est faux.</p>
            </ManifestoBlock>

            {/* Cost */}
            <ManifestoBlock className="space-y-1 text-muted-foreground text-base md:text-lg leading-relaxed">
              <p>Chaque soumission inutile coûte du temps à l'entrepreneur.</p>
              <p>Chaque heure perdue se transforme en coût.</p>
              <p>Et ce coût… vous le payez.</p>
              <p className="text-foreground font-semibold pt-2">Indirectement. Systématiquement. Inefficacement.</p>
            </ManifestoBlock>

            {/* Divider */}
            <ManifestoBlock>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </ManifestoBlock>

            {/* UNPRO exists */}
            <ManifestoBlock className="space-y-4">
              <p className="text-xl md:text-2xl font-bold text-foreground">
                UNPRO existe pour mettre fin à ça.
              </p>
              <div className="space-y-1 text-muted-foreground text-base md:text-lg leading-relaxed">
                <p>Pas pour ajouter une couche de plus.</p>
                <p>Pas pour être une plateforme de leads.</p>
                <p>Pas pour jouer le même jeu.</p>
              </div>
            </ManifestoBlock>

            {/* Le bon */}
            <ManifestoBlock className="glass-card-elevated rounded-2xl p-6 md:p-8 space-y-4 light-ray-fx">
              <p className="text-xl md:text-2xl font-bold text-foreground relative z-10">
                UNPRO élimine le bruit.
              </p>
              <div className="space-y-1 text-muted-foreground text-base md:text-lg leading-relaxed relative z-10">
                <p>Nous ne vous donnons pas 3 choix.</p>
                <p className="text-foreground font-semibold">Nous vous donnons le bon.</p>
              </div>
              <div className="space-y-1 relative z-10">
                <p className="text-foreground font-bold">Le bon professionnel.</p>
                <p className="text-foreground font-bold">Au bon moment.</p>
                <p className="text-foreground font-bold">Pour le bon projet.</p>
              </div>
              <div className="space-y-1 text-muted-foreground text-sm md:text-base leading-relaxed relative z-10 pt-2">
                <p>Basé sur des données réelles.</p>
                <p>Basé sur un score vivant.</p>
                <p>Basé sur une compréhension complète de votre situation.</p>
              </div>
            </ManifestoBlock>

            {/* Replace */}
            <ManifestoBlock className="space-y-2">
              <p className="text-foreground font-bold text-lg md:text-xl">Nous remplaçons la recherche par la <span className="text-gradient">prédiction</span>.</p>
              <p className="text-foreground font-bold text-lg md:text-xl">Nous remplaçons la comparaison par la <span className="text-gradient">précision</span>.</p>
              <p className="text-foreground font-bold text-lg md:text-xl">Nous remplaçons le doute par la <span className="text-gradient">décision</span>.</p>
            </ManifestoBlock>

            {/* Divider */}
            <ManifestoBlock>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </ManifestoBlock>

            {/* Propriétaires */}
            <ManifestoBlock className="space-y-4">
              <p className="text-xs uppercase tracking-[0.25em] text-primary font-medium">Pour les propriétaires</p>
              <div className="space-y-1 text-muted-foreground text-base md:text-lg leading-relaxed">
                <p>Fini les heures à chercher.</p>
                <p>Fini les appels inutiles.</p>
                <p>Fini les décisions à l'aveugle.</p>
              </div>
              <div className="space-y-1 text-foreground font-semibold text-base md:text-lg">
                <p>Vous comprenez votre projet.</p>
                <p>Vous voyez les options.</p>
                <p>Vous choisissez avec clarté.</p>
                <p className="text-gradient font-bold">Et vous réservez immédiatement.</p>
              </div>
            </ManifestoBlock>

            {/* Entrepreneurs */}
            <ManifestoBlock className="space-y-4">
              <p className="text-xs uppercase tracking-[0.25em] text-primary font-medium">Pour les entrepreneurs</p>
              <div className="space-y-1 text-muted-foreground text-base md:text-lg leading-relaxed">
                <p>Fini les leads partagés.</p>
                <p>Fini les soumissions perdues.</p>
                <p>Fini la guerre de prix.</p>
              </div>
              <div className="space-y-1 text-foreground font-semibold text-base md:text-lg">
                <p>Vous recevez des rendez-vous qualifiés.</p>
                <p>Alignés avec votre expertise.</p>
                <p>Alignés avec vos objectifs.</p>
              </div>
              <p className="text-foreground font-bold text-lg md:text-xl pt-1">
                Moins de bruit. <span className="text-gradient">Plus de contrats.</span>
              </p>
            </ManifestoBlock>

            {/* Divider */}
            <ManifestoBlock>
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </ManifestoBlock>

            {/* Moteur */}
            <ManifestoBlock className="space-y-4">
              <p className="text-xl md:text-2xl font-bold text-foreground">
                UNPRO n'est pas une plateforme.
              </p>
              <p className="text-xl md:text-2xl font-bold text-gradient">C'est un moteur.</p>
              <div className="space-y-1 text-muted-foreground text-base md:text-lg leading-relaxed">
                <p>Un moteur qui comprend.</p>
                <p>Un moteur qui filtre.</p>
                <p>Un moteur qui connecte.</p>
              </div>
            </ManifestoBlock>

            {/* Vision */}
            <ManifestoBlock className="space-y-3">
              <p className="text-foreground font-semibold text-base md:text-lg">Nous construisons un monde où :</p>
              <div className="space-y-1 text-muted-foreground text-base md:text-lg leading-relaxed">
                <p>Les bonnes décisions sont évidentes.</p>
                <p>Les bons professionnels sont visibles.</p>
                <p>Et le bon moment… n'est jamais manqué.</p>
              </div>
            </ManifestoBlock>

            {/* Closing */}
            <ManifestoBlock className="space-y-2 pt-4">
              <p className="text-foreground font-bold text-lg md:text-xl">Bienvenue dans la fin des 3 soumissions.</p>
              <p className="text-foreground font-bold text-lg md:text-xl">Bienvenue dans l'ère de la précision.</p>
              <p className="text-2xl md:text-3xl font-extrabold text-gradient">Bienvenue chez UNPRO.</p>
            </ManifestoBlock>

            {/* CTA */}
            <ManifestoBlock className="flex flex-col sm:flex-row gap-3 pt-6">
              <Button asChild size="lg" className="rounded-2xl h-13 px-8 text-base shadow-glow">
                <Link to="/start">
                  Commencer <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-2xl h-13 px-8 text-base">
                <Link to="/entrepreneurs">
                  Je suis entrepreneur
                </Link>
              </Button>
            </ManifestoBlock>
          </motion.div>
        </div>
      </article>
    </MainLayout>
  );
}

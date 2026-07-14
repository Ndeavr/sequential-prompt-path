/**
 * Review Intelligence™ — Public landing (dark cinematic).
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Star, Zap } from "lucide-react";
import HeroBeforeAfter from "@/features/reviewIntelligence/components/HeroBeforeAfter";
import DemoAnimated from "@/features/reviewIntelligence/components/DemoAnimated";
import ValueCards from "@/features/reviewIntelligence/components/ValueCards";
import heroImg from "@/assets/review-intelligence/hero-abstract.jpg";
import SeoHead from "@/seo/components/SeoHead";

export default function PageReviewIntelligenceLanding() {
  return (
    <div className="alex-immersive min-h-screen bg-[#050816] text-white relative overflow-hidden">
      <SeoHead
        title="Review Intelligence™ — Transformez chaque client en preuve"
        description="UNPRO aide vos clients à laisser des avis détaillés qui bâtissent la confiance, améliorent Google et rendent votre expertise lisible pour l'IA."
      />

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 -left-40 h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-0 -right-40 h-[600px] w-[600px] rounded-full bg-cyan-500/15 blur-3xl" />
      </div>

      {/* Hero */}
      <section className="relative pt-16 md:pt-24 pb-16 px-6 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-strong border border-primary/30 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs uppercase tracking-widest text-white/70">Nouveau · Review Intelligence™</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-[1.05] mb-6">
            Arrêtez de perdre des clients<br />
            <span className="bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text text-transparent">
              à cause d'avis faibles.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            UNPRO aide vos clients à écrire des avis détaillés qui bâtissent la confiance, améliorent votre visibilité Google et rendent votre expertise lisible pour ChatGPT et Gemini.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link to="/entrepreneur/join?product=review_intelligence">
              <Button size="lg" className="rounded-full h-12 px-8 bg-gradient-to-r from-primary to-cyan-500 hover:opacity-95 text-white font-semibold shadow-[0_10px_40px_-10px_rgba(59,130,246,0.5)]">
                Commencer pour 1 $
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <a href="#demo">
              <Button size="lg" variant="ghost" className="rounded-full h-12 px-6 text-white/80 hover:bg-white/5">
                Voir un exemple
              </Button>
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-transparent to-transparent z-10 pointer-events-none" />
          <img
            src={heroImg}
            alt="Transformation d'avis clients avec Review Intelligence"
            width={1920}
            height={1080}
            className="rounded-3xl w-full opacity-70 border border-white/5"
          />
        </motion.div>

        <div className="mt-16 md:mt-20">
          <HeroBeforeAfter />
        </div>
      </section>

      {/* Demo */}
      <section id="demo" className="relative py-16 md:py-24 px-6 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="text-xs uppercase tracking-widest text-primary mb-3">Comment ça fonctionne</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">De la fin du chantier<br />à la recommandation IA.</h2>
          <p className="text-white/60 max-w-2xl mx-auto">Un flux complet en cinq étapes. Automatisé. Mesurable. Détectable par Google et l'IA.</p>
        </motion.div>
        <DemoAnimated />
      </section>

      {/* Value */}
      <section className="relative py-16 md:py-24 px-6 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="text-xs uppercase tracking-widest text-primary mb-3">Pourquoi ça marche</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Ce n'est pas un outil de collecte.<br />C'est un moteur de croissance.</h2>
        </motion.div>
        <ValueCards />
      </section>

      {/* Final CTA */}
      <section className="relative py-24 px-6 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-strong rounded-[32px] p-10 md:p-16 border border-primary/20 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-cyan-500/10 pointer-events-none" />
          <div className="relative">
            <Zap className="h-10 w-10 text-primary mx-auto mb-4" />
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Activez Review Intelligence™<br />pour <span className="text-primary">1 $</span>.
            </h2>
            <p className="text-white/60 mb-8 max-w-xl mx-auto">
              Importez vos clients existants, envoyez des demandes, collectez des avis structurés en moins de 5 minutes.
            </p>
            <Link to="/entrepreneur/join?product=review_intelligence">
              <Button size="lg" className="rounded-full h-14 px-10 bg-gradient-to-r from-primary to-cyan-500 text-white font-semibold text-base shadow-[0_10px_40px_-10px_rgba(59,130,246,0.5)]">
                Commencer maintenant
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}

/**
 * UNPRO — PageContractorLandingAcquisition
 * Entrepreneur acquisition landing page.
 * Master message: "Plus de contrats grâce à l'intelligence artificielle".
 * Alex voice (FR) auto-starts on first user gesture.
 */
import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Zap, Shield, TrendingUp, BarChart3, Star, MapPin, FileCheck, Camera, MessageSquare, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import SectionContainer from "@/components/unpro/SectionContainer";
import CardGlass from "@/components/unpro/CardGlass";
import { fadeUp, staggerContainer, scaleIn } from "@/lib/motion";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

const FLOATING_CARDS = [
  { icon: FileCheck, label: "RBQ", delay: 0 },
  { icon: Star, label: "Avis", delay: 0.1 },
  { icon: Camera, label: "Portfolio", delay: 0.2 },
  { icon: MapPin, label: "Territoires", delay: 0.3 },
  { icon: Shield, label: "Assurances", delay: 0.4 },
  { icon: MessageSquare, label: "FAQ", delay: 0.5 },
];

const VALUE_PROPS = [
  {
    icon: Zap,
    title: "Import intelligent",
    desc: "Vos données publiques importées automatiquement. Zéro saisie manuelle.",
  },
  {
    icon: BarChart3,
    title: "Score AIPP",
    desc: "Votre indice de performance et de crédibilité calculé en temps réel.",
  },
  {
    icon: TrendingUp,
    title: "Projections de revenus",
    desc: "Estimations de rendez-vous et de revenus basées sur votre marché.",
  },
  {
    icon: Shield,
    title: "Profil vérifié",
    desc: "Licences, assurances et avis centralisés. Confiance immédiate.",
  },
];

export default function PageContractorLandingAcquisition() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const autoStartedRef = useRef(false);

  const startAlexVoice = useCallback(() => {
    autoStartedRef.current = true;
    openAlex("contractor_acquisition", "fr");
  }, [openAlex]);

  // Auto-start Alex (FR) on first user gesture (browser autoplay policy)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("no_autostart") === "1") return;

    const start = () => {
      if (autoStartedRef.current) return;
      autoStartedRef.current = true;
      openAlex("contractor_acquisition", "fr");
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      window.removeEventListener("touchstart", start);
    };
    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    window.addEventListener("touchstart", start, { once: true });

    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      window.removeEventListener("touchstart", start);
    };
  }, [openAlex]);

  return (
    <>
      <Helmet>
        <title>Plus de contrats grâce à l'intelligence artificielle | UNPRO</title>
        <meta
          name="description"
          content="UNPRO aide les entrepreneurs du Québec à obtenir plus de rendez-vous qualifiés, améliorer leur visibilité et convertir davantage. Voir mon potentiel gratuit."
        />
      </Helmet>

      <div className="min-h-screen bg-background overflow-hidden">
        {/* ─── Hero Section ─── */}
        <section className="relative min-h-[90vh] flex items-center justify-center px-4">
          {/* Background aura */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-[100px]" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-6"
            >
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">Pour les entrepreneurs du Québec</span>
            </motion.div>

            {/* Headline — Master message */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-3xl sm:text-5xl lg:text-6xl font-bold font-display tracking-tight text-foreground mb-5 leading-[1.05]"
            >
              Plus de contrats grâce à{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                l'intelligence artificielle
              </span>
              .
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-8"
            >
              UNPRO aide les entrepreneurs du Québec à obtenir plus de rendez-vous qualifiés,
              améliorer leur visibilité et convertir davantage.
            </motion.p>

            {/* Dual CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <Button
                size="lg"
                className="h-13 px-8 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all shadow-[var(--shadow-glow)]"
                onClick={() => navigate("/entrepreneur/onboarding")}
              >
                Voir mon potentiel gratuit
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-13 px-8 text-base rounded-xl border-primary/30 gap-2"
                onClick={startAlexVoice}
              >
                <Mic className="h-4 w-4 text-primary" />
                Parler à Alex
              </Button>
            </motion.div>

            {/* Floating data cards */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="flex flex-wrap justify-center gap-2 mt-12"
            >
              {FLOATING_CARDS.map((card) => (
                <motion.div
                  key={card.label}
                  variants={scaleIn}
                  className="glass-card flex items-center gap-2 px-3 py-2 rounded-xl"
                >
                  <card.icon className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">{card.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── Value Props ─── */}
        <SectionContainer width="default">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {VALUE_PROPS.map((prop) => (
              <CardGlass key={prop.title} hoverable className="text-center">
                <motion.div variants={fadeUp}>
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 mb-3">
                    <prop.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{prop.title}</h3>
                  <p className="text-xs text-muted-foreground">{prop.desc}</p>
                </motion.div>
              </CardGlass>
            ))}
          </motion.div>
        </SectionContainer>

        {/* ─── How AIPP Works ─── */}
        <SectionContainer width="narrow" id="demo-import">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-3">
              Comment ça fonctionne
            </h2>
            <p className="text-sm text-muted-foreground">
              3 étapes pour un profil AIPP complet et activé
            </p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer}
            className="space-y-4"
          >
            {[
              { step: "01", title: "Entrez votre nom d'entreprise", desc: "On importe tout automatiquement : RBQ, avis, site web, services, zones." },
              { step: "02", title: "Complétez votre profil AIPP", desc: "Ajoutez logo, photos, FAQ et validez les informations détectées." },
              { step: "03", title: "Activez et recevez des rendez-vous", desc: "Choisissez votre plan, payez et votre profil est publié instantanément." },
            ].map((item) => (
              <CardGlass key={item.step} hoverable>
                <motion.div variants={fadeUp} className="flex items-start gap-4">
                  <span className="text-2xl font-bold font-display bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    {item.step}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </motion.div>
              </CardGlass>
            ))}
          </motion.div>
        </SectionContainer>

        {/* ─── Final CTA ─── */}
        <SectionContainer width="narrow" gradient className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-3">
            Prêt à transformer votre entreprise?
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            10 minutes pour un profil complet. Aucun mot de passe requis.
          </p>
          <Button
            size="lg"
            className="h-13 px-10 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-[var(--shadow-glow)]"
            onClick={() => navigate("/entrepreneur/onboarding")}
          >
            Commencer maintenant
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </SectionContainer>
      </div>
    </>
  );
}

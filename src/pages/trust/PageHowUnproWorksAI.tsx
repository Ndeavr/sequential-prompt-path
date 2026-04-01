/**
 * UNPRO — PageHowUnproWorksAI
 * Public page explaining how UNPRO's AI works — transparency + authority.
 */
import { Helmet } from "react-helmet-async";
import SectionContainer from "@/components/unpro/SectionContainer";
import PanelAIExplainedSimple from "@/components/trust/PanelAIExplainedSimple";
import PanelTrustStack from "@/components/trust/PanelTrustStack";
import BadgeAEOAuthority from "@/components/trust/BadgeAEOAuthority";
import { motion } from "framer-motion";
import { fadeUp, viewportOnce } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ROUTES } from "@/config/routesConfig";

export default function PageHowUnproWorksAI() {
  return (
    <>
      <Helmet>
        <title>Comment fonctionne l'IA UNPRO | Transparence algorithmique</title>
        <meta
          name="description"
          content="Découvrez comment l'IA UNPRO détecte vos problèmes, recommande les meilleurs professionnels et facilite la prise de rendez-vous instantanée."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "Comment UNPRO utilise l'IA pour les services résidentiels",
            step: [
              { "@type": "HowToStep", name: "Détection", text: "Analyse du problème via photo, texte ou voix" },
              { "@type": "HowToStep", name: "Recommandation", text: "Comparaison des entrepreneurs par score et compatibilité" },
              { "@type": "HowToStep", name: "Décision", text: "Réservation immédiate du meilleur professionnel" },
            ],
          })}
        </script>
      </Helmet>

      <main className="min-h-screen pb-20">
        <SectionContainer width="narrow" className="pt-20 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="space-y-4">
            <BadgeAEOAuthority />
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Comment fonctionne l'IA UNPRO?
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Transparence totale sur notre processus de recommandation. Pas de boîte noire — vous voyez exactement comment nous trouvons le bon professionnel.
            </p>
          </motion.div>
        </SectionContainer>

        <SectionContainer>
          <PanelAIExplainedSimple />
        </SectionContainer>

        <SectionContainer width="narrow">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={fadeUp}
            className="space-y-6"
          >
            <h2 className="font-display text-xl font-bold text-foreground">
              Pourquoi nous faire confiance?
            </h2>
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                UNPRO utilise un score <strong className="text-foreground">AIPP</strong> (AI-Indexed Professional Profile) pour évaluer chaque entrepreneur sur 8 dimensions : visibilité, conversion, données structurées, SEO, contenu, avis, branding et signaux de confiance.
              </p>
              <p>
                Chaque recommandation est basée sur des <strong className="text-foreground">données vérifiées</strong> — licences RBQ, avis authentiques, historique de projets complétés et compatibilité avec votre projet spécifique.
              </p>
              <p>
                Notre algorithme de matching <strong className="text-foreground">DNA</strong> évalue la compatibilité entre vos priorités (budget, qualité, rapidité) et le profil de chaque entrepreneur.
              </p>
            </div>

            <PanelTrustStack
              aippScore={85}
              projectsCompleted={1250}
              reviewCount={340}
              isVerified
            />
          </motion.div>
        </SectionContainer>

        <SectionContainer width="narrow" className="text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={viewportOnce} variants={fadeUp} className="space-y-4">
            <h2 className="font-display text-xl font-bold text-foreground">
              Prêt à essayer?
            </h2>
            <Button asChild size="lg">
              <Link to={ROUTES.HOME}>Trouver un professionnel</Link>
            </Button>
          </motion.div>
        </SectionContainer>
      </main>
    </>
  );
}

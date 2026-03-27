/**
 * HomePageUnproV2 — Premium conversion homepage with card carousel.
 */
import { Helmet } from "react-helmet-async";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import MainLayout from "@/layouts/MainLayout";
import HeroSectionV2 from "@/components/home/HeroSectionV2";
import UnproOfferCarousel from "@/components/home/UnproOfferCarousel";
import TrustProofSection from "@/components/home/TrustProofSection";
import UnproStickyPromoBar from "@/components/home/UnproStickyPromoBar";
import { primaryOfferCards, secondaryOfferCards } from "@/data/offerCardsData";
import { motion } from "framer-motion";

export default function HomePageUnproV2() {
  const { openAlex } = useAlexVoice();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "UNPRO",
    "description": "Service intelligent de jumelage avec rendez-vous garantis entre propriétaires et entrepreneurs vérifiés.",
    "url": "https://unpro.ca",
    "areaServed": { "@type": "Place", "name": "Quebec" },
    "provider": { "@type": "Organization", "name": "UNPRO", "url": "https://unpro.ca" },
  };

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Trouvez le bon professionnel. Sans bruit.</title>
        <meta name="description" content="L'IA d'UnPRO analyse votre besoin, vérifie les entrepreneurs et vous propose les meilleurs — prêts à intervenir. Rendez-vous garantis." />
        <meta property="og:title" content="UNPRO — Trouvez le bon professionnel. Sans bruit." />
        <meta property="og:description" content="UNPRO remplace les soumissions multiples par un rendez-vous garanti avec le bon entrepreneur." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://unpro.ca" />
        <link rel="canonical" href="https://unpro.ca" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="flex flex-col bg-background text-foreground">
        {/* ═══ HERO ═══ */}
        <HeroSectionV2 onAlexClick={openAlex} />

        {/* ═══ PRIMARY CAROUSEL ═══ */}
        <section className="py-8 md:py-12">
          <div className="max-w-4xl mx-auto mb-6 px-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Tout ce que vous pouvez faire</p>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                Un système. Toutes les réponses.
              </h2>
            </motion.div>
          </div>
          <UnproOfferCarousel cards={primaryOfferCards} onAlexClick={openAlex} />
        </section>

        {/* ═══ TRUST ═══ */}
        <TrustProofSection />

        {/* ═══ SECONDARY CAROUSEL ═══ */}
        <section className="py-8 md:py-12">
          <div className="max-w-4xl mx-auto mb-6 px-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Pour entrepreneurs</p>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                Développez votre activité.
              </h2>
            </motion.div>
          </div>
          <UnproOfferCarousel cards={secondaryOfferCards} />
        </section>

        {/* ═══ STICKY PROMO ═══ */}
        <UnproStickyPromoBar />
      </div>
    </MainLayout>
  );
}

import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.04 } },
};

interface FAQItem {
  q: string;
  a: string | string[];
}

const FAQ_ITEMS: FAQItem[] = [
  {
    q: "1. UNPRO, c'est quoi exactement ?",
    a: "UNPRO est une plateforme intelligente qui comprend votre projet et vous connecte directement avec le bon entrepreneur.",
  },
  {
    q: "2. En quoi c'est différent des plateformes classiques ?",
    a: ["On ne vous envoie pas 3 soumissions.", "On vous dirige vers la meilleure option dès le départ."],
  },
  {
    q: "3. Pourquoi éliminer les 3 soumissions ?",
    a: ["Parce que comparer 3 prix ≠ prendre la bonne décision.", "UNPRO filtre le bruit avant même que vous commenciez."],
  },
  {
    q: "4. Comment UNPRO sait qui est le bon entrepreneur ?",
    a: ["Grâce à un score intelligent basé sur :", "• Performance réelle", "• Réputation", "• Spécialisation", "• Compatibilité avec votre projet"],
  },
  {
    q: "5. Est-ce que c'est vraiment plus rapide ?",
    a: "Oui. En quelques secondes, vous passez de « je ne sais pas par où commencer » à un rendez-vous concret.",
  },
  {
    q: "6. Est-ce que je parle à un humain ou à une IA ?",
    a: "Vous êtes guidé par Alex, une IA conçue pour comprendre votre situation et vous orienter efficacement.",
  },
  {
    q: "7. Est-ce que je dois remplir un long formulaire ?",
    a: "Non. UNPRO fonctionne avec des interactions simples, naturelles, souvent avec une seule question à la fois.",
  },
  {
    q: "8. Est-ce que c'est gratuit ?",
    a: "Oui, pour les propriétaires. Vous pouvez utiliser la plateforme sans frais.",
  },
  {
    q: "9. Comment UNPRO gagne de l'argent ?",
    a: "Les entrepreneurs paient pour recevoir des rendez-vous qualifiés. Pas pour des leads partagés.",
  },
  {
    q: "10. Les entrepreneurs sont-ils vérifiés ?",
    a: "Oui. Licences, réputation, cohérence… tout est analysé.",
  },
  {
    q: "11. Est-ce que je peux comparer quand même ?",
    a: ["Oui, mais intelligemment.", "UNPRO analyse les soumissions pour vous montrer :", "• Les écarts", "• Les zones floues", "• Les oublis"],
  },
  {
    q: "12. Est-ce que ça marche pour tous les types de travaux ?",
    a: "Oui. Du petit projet au chantier majeur.",
  },
  {
    q: "13. Et si je ne connais rien aux travaux ?",
    a: "Parfait. UNPRO est conçu pour vous guider, pas vous compliquer la vie.",
  },
  {
    q: "14. Est-ce que je peux voir des estimations ?",
    a: "Oui. Vous obtenez des estimations basées sur des données réelles.",
  },
  {
    q: "15. Est-ce que je peux choisir mon entrepreneur ?",
    a: "Oui. UNPRO recommande, mais vous gardez le contrôle.",
  },
  {
    q: "16. Est-ce que les rendez-vous sont partagés ?",
    a: "Non. Chaque rendez-vous est exclusif à un entrepreneur.",
  },
  {
    q: "17. Est-ce que ça évite les mauvaises surprises ?",
    a: "Oui. UNPRO identifie les incohérences avant que vous vous engagiez.",
  },
  {
    q: "18. Est-ce que je peux garder un historique de mes travaux ?",
    a: "Oui. Tout est enregistré dans votre Passeport Maison.",
  },
  {
    q: "19. C'est quoi le Passeport Maison ?",
    a: ["Un dossier intelligent de votre propriété :", "• Factures", "• Travaux", "• Documents", "• Historique"],
  },
  {
    q: "20. Est-ce utile pour la revente ?",
    a: "Oui. Vous avez une preuve claire de tout ce qui a été fait.",
  },
  {
    q: "21. Est-ce que ça aide les entrepreneurs aussi ?",
    a: "Oui. Moins de soumissions inutiles, plus de contrats réels.",
  },
  {
    q: "22. Est-ce que ça réduit les coûts ?",
    a: "Oui. Moins de perte de temps = meilleurs prix.",
  },
  {
    q: "23. Est-ce que UNPRO remplace Google ?",
    a: "Pas exactement. UNPRO devient la réponse, pas la recherche.",
  },
  {
    q: "24. Est-ce que c'est fiable ?",
    a: "Le système apprend en continu et s'améliore avec chaque projet.",
  },
  {
    q: "25. En une phrase, UNPRO c'est quoi ?",
    a: ["👉 Moins de bruit.", "👉 Meilleure décision.", "👉 Le bon entrepreneur, dès le départ."],
  },
];

function renderAnswer(a: string | string[]) {
  if (typeof a === "string") {
    return <p className="text-muted-foreground text-sm md:text-base leading-relaxed">{a}</p>;
  }
  return (
    <div className="space-y-1">
      {a.map((line, i) => (
        <p key={i} className="text-muted-foreground text-sm md:text-base leading-relaxed">
          {line}
        </p>
      ))}
    </div>
  );
}

export default function PageUnproFAQ25() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: Array.isArray(item.a) ? item.a.join(" ") : item.a,
      },
    })),
  };

  return (
    <MainLayout>
      <Helmet>
        <title>C'est quoi UNPRO ? 25 questions-réponses | UNPRO</title>
        <meta
          name="description"
          content="Découvrez UNPRO en 25 questions. Comment ça marche, pourquoi c'est différent, et comment obtenir le bon entrepreneur pour votre projet."
        />
        <link rel="canonical" href="https://unpro.ca/cest-quoi-unpro" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <article className="relative overflow-hidden">
        {/* Background aura */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[5%] left-[10%] w-[50vw] h-[50vw] rounded-full bg-primary/5 blur-[140px]" />
          <div className="absolute bottom-[15%] right-[5%] w-[35vw] h-[35vw] rounded-full bg-secondary/4 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-5 py-16 md:py-28">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-10">
            {/* Hero */}
            <motion.div variants={fadeUp} className="text-center space-y-4">
              <p className="text-xs uppercase tracking-[0.25em] text-primary font-medium">
                FAQ
              </p>
              <h1 className="text-3xl md:text-5xl font-extrabold text-foreground leading-[1.1] font-display">
                C'est quoi <span className="text-gradient">UNPRO</span> ?
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
                25 questions pour tout comprendre. Simplement.
              </p>
            </motion.div>

            {/* Accordion */}
            <motion.div variants={fadeUp}>
              <Accordion type="multiple" className="space-y-2">
                {FAQ_ITEMS.map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`q-${i}`}
                    className="glass-card-elevated rounded-2xl border-border/30 px-5 py-1 light-ray-fx overflow-hidden"
                  >
                    <AccordionTrigger className="text-left text-sm md:text-base font-semibold text-foreground hover:no-underline py-4 relative z-10">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 relative z-10">
                      {renderAnswer(item.a)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>

            {/* CTA Final */}
            <motion.div variants={fadeUp}>
              <div className="glass-card-elevated rounded-3xl p-6 md:p-10 text-center light-ray-fx">
                <div className="relative z-10 space-y-4">
                  <Sparkles className="h-10 w-10 text-primary mx-auto" />
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                    Vous avez un projet ?
                  </h2>
                  <p className="text-muted-foreground text-base md:text-lg">
                    Parlez à Alex.<br />
                    Elle va vous montrer exactement par où commencer.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <Button asChild size="lg" className="rounded-2xl h-13 px-8 text-base shadow-glow">
                      <Link to="/alex">
                        Parler à Alex <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="rounded-2xl h-13 px-8 text-base">
                      <Link to="/start">
                        Commencer un projet
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </article>
    </MainLayout>
  );
}

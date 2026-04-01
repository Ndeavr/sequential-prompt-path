/**
 * UNPRO — PageRoadmapFeatures
 * Public roadmap showing deployed, in-progress, and upcoming features.
 */
import { Helmet } from "react-helmet-async";
import SectionContainer from "@/components/unpro/SectionContainer";
import TimelineRoadmapFeatures from "@/components/trust/TimelineRoadmapFeatures";
import { useRoadmapFeatures } from "@/hooks/useTrustData";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import { Rocket, Loader2 } from "lucide-react";

// Fallback data when DB is empty
const FALLBACK_FEATURES = [
  { id: "1", title: "Matching IA instantané", description: "Recommandation du meilleur entrepreneur en <5 secondes", status: "live" as const, category: "Core" },
  { id: "2", title: "Score AIPP", description: "Évaluation automatique de la crédibilité des entrepreneurs", status: "live" as const, category: "Trust" },
  { id: "3", title: "Alex — Assistant IA vocal", description: "Assistant conversationnel voice-first pour guider vos décisions", status: "live" as const, category: "Alex" },
  { id: "4", title: "Passeport Maison avancé", description: "Historique complet et score de santé de votre propriété", status: "in_progress" as const, category: "Propriétaire" },
  { id: "5", title: "Facturation + Taxes intégrées", description: "Gestion automatique des factures et taxes québécoises", status: "in_progress" as const, category: "Pro" },
  { id: "6", title: "Designer IA", description: "Visualisation de vos rénovations avant de commencer", status: "upcoming" as const, category: "Innovation" },
  { id: "7", title: "Maintenance prédictive", description: "Alertes automatiques basées sur l'âge et l'état de vos équipements", status: "upcoming" as const, category: "Prédiction" },
  { id: "8", title: "Financement intégré", description: "Options de financement directement dans le flow de réservation", status: "upcoming" as const, category: "Conversion" },
];

export default function PageRoadmapFeatures() {
  const { data: features, isLoading } = useRoadmapFeatures();
  const displayFeatures = features && features.length > 0 ? features : FALLBACK_FEATURES;

  return (
    <>
      <Helmet>
        <title>Roadmap UNPRO | Fonctionnalités en développement</title>
        <meta
          name="description"
          content="Découvrez les fonctionnalités déployées, en cours de développement et à venir sur UNPRO. Notre vision pour transformer les services résidentiels."
        />
      </Helmet>

      <main className="min-h-screen pb-20">
        <SectionContainer width="narrow" className="pt-20 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
              <Rocket className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">Roadmap produit</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Notre vision, votre avenir
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              UNPRO évolue constamment. Voici ce qui est déployé, en cours et à venir pour transformer votre expérience.
            </p>
          </motion.div>
        </SectionContainer>

        <SectionContainer width="narrow">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <TimelineRoadmapFeatures features={displayFeatures} />
          )}
        </SectionContainer>
      </main>
    </>
  );
}

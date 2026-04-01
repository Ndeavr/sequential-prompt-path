/**
 * UNPRO — PageGuidesHomeProblems
 * Library of home problem guides with solutions and costs.
 */
import { Helmet } from "react-helmet-async";
import { useState } from "react";
import SectionContainer from "@/components/unpro/SectionContainer";
import CardGuideProblemSolution from "@/components/trust/CardGuideProblemSolution";
import BadgeAEOAuthority from "@/components/trust/BadgeAEOAuthority";
import { useGuidesContent } from "@/hooks/useTrustData";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer, viewportOnce } from "@/lib/motion";
import { BookOpen, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import InternalLinksTrust from "@/components/trust/InternalLinksTrust";

// Fallback guides
const FALLBACK_GUIDES = [
  { id: "1", slug: "infiltration-eau-sous-sol", problem: "Infiltration d'eau au sous-sol", symptoms: ["Taches d'humidité", "Odeur de moisi"], causes: ["Drain français défectueux"], solution: "Excavation et remplacement du drain français avec membrane d'étanchéité", estimated_cost_min: 8000, estimated_cost_max: 15000, severity: "high" as const, category: "Fondation", is_published: true },
  { id: "2", slug: "toit-qui-coule", problem: "Toiture qui coule", symptoms: ["Taches au plafond", "Bardeaux soulevés"], causes: ["Bardeaux usés", "Solins défectueux"], solution: "Remplacement partiel ou complet de la toiture", estimated_cost_min: 5000, estimated_cost_max: 12000, severity: "high" as const, category: "Toiture", is_published: true },
  { id: "3", slug: "chauffage-inegal", problem: "Chauffage inégal dans la maison", symptoms: ["Pièces froides", "Factures élevées"], causes: ["Isolation insuffisante", "Système vieillissant"], solution: "Audit énergétique + isolation ou remplacement du système", estimated_cost_min: 2000, estimated_cost_max: 8000, severity: "moderate" as const, category: "Chauffage", is_published: true },
  { id: "4", slug: "moisissure-salle-bain", problem: "Moisissure dans la salle de bain", symptoms: ["Taches noires", "Odeur persistante"], causes: ["Ventilation insuffisante", "Joints usés"], solution: "Installation d'un ventilateur d'extraction + traitement anti-moisissure", estimated_cost_min: 500, estimated_cost_max: 2500, severity: "moderate" as const, category: "Ventilation", is_published: true },
  { id: "5", slug: "fissure-fondation", problem: "Fissure dans la fondation", symptoms: ["Fissure visible", "Infiltration d'eau"], causes: ["Mouvement du sol", "Gel/dégel"], solution: "Injection d'époxy ou polyuréthane + surveillance", estimated_cost_min: 800, estimated_cost_max: 5000, severity: "critical" as const, category: "Fondation", is_published: true },
  { id: "6", slug: "panneau-electrique-vetuste", problem: "Panneau électrique vétuste", symptoms: ["Disjoncteurs qui sautent", "Câblage apparent"], causes: ["Installation datant de 30+ ans"], solution: "Remplacement du panneau 200A + mise aux normes", estimated_cost_min: 2500, estimated_cost_max: 5000, severity: "critical" as const, category: "Électricité", is_published: true },
];

export default function PageGuidesHomeProblems() {
  const { data: guides, isLoading } = useGuidesContent();
  const [search, setSearch] = useState("");

  const displayGuides = guides && guides.length > 0 ? guides : FALLBACK_GUIDES;
  const filtered = displayGuides.filter(
    (g: any) =>
      g.problem.toLowerCase().includes(search.toLowerCase()) ||
      (g.category && g.category.toLowerCase().includes(search.toLowerCase())),
  );

  const categories = [...new Set(displayGuides.map((g: any) => g.category).filter(Boolean))];

  return (
    <>
      <Helmet>
        <title>Guides — Problèmes de maison | UNPRO</title>
        <meta
          name="description"
          content="Guides complets sur les problèmes résidentiels courants : symptômes, causes, solutions et coûts estimés. Trouvez la solution rapidement."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Guides — Problèmes de maison",
            numberOfItems: displayGuides.length,
            itemListElement: displayGuides.map((g: any, i: number) => ({
              "@type": "ListItem",
              position: i + 1,
              name: g.problem,
              url: `https://unpro.ca/guides/${g.slug}`,
            })),
          })}
        </script>
      </Helmet>

      <main className="min-h-screen pb-20">
        <SectionContainer width="narrow" className="pt-20 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-primary">Centre de connaissances</span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Guides — Problèmes de maison
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Comprenez vos problèmes, découvrez les solutions et estimez les coûts avant de faire appel à un professionnel.
            </p>
            <BadgeAEOAuthority />
          </motion.div>
        </SectionContainer>

        <SectionContainer width="narrow">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un problème..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </SectionContainer>

        <SectionContainer>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {filtered.map((guide: any) => (
                <motion.div key={guide.id} variants={fadeUp}>
                  <CardGuideProblemSolution
                    slug={guide.slug}
                    problem={guide.problem}
                    symptoms={guide.symptoms ?? []}
                    solution={guide.solution ?? ""}
                    estimatedCostMin={guide.estimated_cost_min}
                    estimatedCostMax={guide.estimated_cost_max}
                    severity={guide.severity ?? "moderate"}
                    category={guide.category}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Aucun guide trouvé pour « {search} »
            </div>
          )}
        </SectionContainer>
      </main>
    </>
  );
}

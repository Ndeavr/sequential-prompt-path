/**
 * Trending Page — Top voted renovation transformations.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, Award, Clock, Camera, Sparkles, ChevronRight, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useGrowthFeed } from "@/hooks/useGrowthFeed";
import { Helmet } from "react-helmet-async";

const CATEGORY_FR: Record<string, string> = {
  kitchen: "Cuisine", bathroom: "Salle de bain", basement: "Sous-sol",
  "living room": "Salon", facade: "Façade", roof: "Toiture",
  backyard: "Cour", pool: "Piscine", deck: "Terrasse",
};

const TrendingPage = () => {
  const [period, setPeriod] = useState<"top_week" | "top_month" | "trending">("trending");
  const { projects, isLoading } = useGrowthFeed(period);

  return (
    <>
      <Helmet>
        <title>Tendances rénovation — Les transformations les plus populaires | UNPRO</title>
        <meta name="description" content="Découvrez les projets de rénovation les plus votés cette semaine. Cuisine, façade, cour arrière et plus." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="bg-gradient-to-b from-primary/5 to-background border-b border-border/40">
          <div className="max-w-5xl mx-auto px-4 py-10 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
              <TrendingUp className="h-3.5 w-3.5" /> Tendances
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
              Transformations populaires
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Les projets de rénovation les plus votés par la communauté UNPRO.
            </p>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <TabsList className="mx-auto">
              <TabsTrigger value="trending" className="gap-1"><TrendingUp className="h-3 w-3" /> Tendances</TabsTrigger>
              <TabsTrigger value="top_week" className="gap-1"><Award className="h-3 w-3" /> Cette semaine</TabsTrigger>
              <TabsTrigger value="top_month" className="gap-1"><Clock className="h-3 w-3" /> Ce mois</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 rounded-2xl bg-muted/30 animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <Sparkles className="h-12 w-12 text-primary/30 mx-auto" />
              <p className="text-muted-foreground">Aucune transformation encore cette période.</p>
              <Link to="/alex/renovation">
                <Button className="rounded-full gap-2"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
                >
                  <Camera className="h-4 w-4" /> Créer la première
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project, i) => {
                const catFr = CATEGORY_FR[project.category] || project.category;
                const mainImg = project.concepts[0]?.image_url || project.original_image_url;

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link to={`/transformations/${project.slug || project.id}`}
                      className="flex items-center gap-4 p-3 rounded-2xl bg-card border border-border/40 hover:shadow-md transition-all group"
                    >
                      {/* Rank */}
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-display font-bold text-lg ${
                        i === 0 ? "bg-warning/10 text-warning" :
                        i === 1 ? "bg-muted text-muted-foreground" :
                        i === 2 ? "bg-warning/5 text-warning/70" :
                        "bg-muted/50 text-muted-foreground"
                      }`}>
                        {i + 1}
                      </div>

                      {/* Image */}
                      <div className="h-16 w-20 rounded-xl overflow-hidden shrink-0 border border-border/40">
                        {mainImg ? (
                          <img src={mainImg} alt={catFr} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-muted/30" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          Transformation {catFr}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {project.city && <span>{project.city}</span>}
                          {project.budget && <span>· {project.budget}</span>}
                        </div>
                      </div>

                      {/* Votes */}
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10">
                        <Vote className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm font-bold text-primary">{project.vote_count}</span>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default TrendingPage;

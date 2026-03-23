/**
 * UNPRO — Home Problem Graph Explorer
 * Hub page showing the knowledge graph: Problems → Solutions → Professionals → Cities
 * /problemes
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, AlertTriangle, DollarSign, Wrench, MapPin, ArrowRight,
  Droplets, Zap, Flame, Bug, Wind, Home, TreePine, Shield,
} from "lucide-react";
import { SEO_PROBLEMS, type SeoProblem, getAllContractorTypes } from "@/seo/data/problems";
import { SEO_CITIES } from "@/seo/data/cities";
import { motion } from "framer-motion";

// ─── Category groups for visual clustering ───
const PROBLEM_CATEGORIES: { key: string; labelFr: string; icon: React.ElementType; types: string[] }[] = [
  { key: "toiture", labelFr: "Toiture", icon: Home, types: ["couvreur"] },
  { key: "fondation", labelFr: "Fondation & sous-sol", icon: Shield, types: ["fondation", "drain", "excavation"] },
  { key: "plomberie", labelFr: "Plomberie", icon: Droplets, types: ["plombier"] },
  { key: "electricite", labelFr: "Électricité", icon: Zap, types: ["electricien"] },
  { key: "isolation", labelFr: "Isolation & énergie", icon: Flame, types: ["isolation", "chauffage", "thermopompe", "fenetre"] },
  { key: "humidite", labelFr: "Humidité & moisissure", icon: Wind, types: ["ventilation"] },
  { key: "exterieur", labelFr: "Extérieur", icon: TreePine, types: ["revetement", "peinture", "maconnerie", "paysagiste", "charpentier", "menuisier"] },
  { key: "ravageurs", labelFr: "Ravageurs", icon: Bug, types: ["exterminateur"] },
  { key: "qualite-air", labelFr: "Qualité de l'air", icon: Wind, types: ["decontamination"] },
];

const urgencyConfig: Record<string, { color: string; label: string }> = {
  critical: { color: "bg-destructive/10 text-destructive", label: "Critique" },
  high: { color: "bg-destructive/10 text-destructive", label: "Élevée" },
  medium: { color: "bg-accent/10 text-accent-foreground", label: "Moyenne" },
  low: { color: "bg-secondary/10 text-secondary", label: "Faible" },
};

function ProblemCard({ problem }: { problem: SeoProblem }) {
  const urg = urgencyConfig[problem.urgency] ?? urgencyConfig.medium;
  const topCities = SEO_CITIES.slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
    >
      <Card className="group border-border/50 hover:border-primary/30 transition-all hover:shadow-md h-full">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/probleme/${problem.slug}`} className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
              {problem.name}
            </Link>
            <Badge className={`${urg.color} text-[10px] shrink-0`}>{urg.label}</Badge>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{problem.shortDescription}</p>

          {/* Cost */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            {problem.costEstimate.low.toLocaleString("fr-CA")}$ — {problem.costEstimate.high.toLocaleString("fr-CA")}$
          </div>

          {/* Contractor types */}
          <div className="flex flex-wrap gap-1">
            {problem.contractorTypes.slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="text-[10px] py-0">
                <Wrench className="h-2.5 w-2.5 mr-0.5" />
                {t}
              </Badge>
            ))}
          </div>

          {/* City links */}
          <div className="flex flex-wrap gap-1 pt-1 border-t border-border/30">
            {topCities.map((city) => (
              <Link
                key={city.slug}
                to={`/probleme/${problem.slug}/${city.slug}`}
                className="text-[10px] text-primary/70 hover:text-primary transition-colors"
              >
                {city.name}
              </Link>
            ))}
            <span className="text-[10px] text-muted-foreground">+{SEO_CITIES.length - 4} villes</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ProblemGraphPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredProblems = useMemo(() => {
    let results = SEO_PROBLEMS;

    if (activeCategory) {
      const cat = PROBLEM_CATEGORIES.find((c) => c.key === activeCategory);
      if (cat) {
        results = results.filter((p) =>
          p.contractorTypes.some((t) => cat.types.includes(t))
        );
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          p.contractorTypes.some((t) => t.includes(q))
      );
    }

    return results;
  }, [search, activeCategory]);

  const totalPages = SEO_PROBLEMS.length * SEO_CITIES.length;
  const contractorTypes = getAllContractorTypes();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Problèmes résidentiels au Québec — UNPRO",
    description: `Explorez ${SEO_PROBLEMS.length} problèmes résidentiels courants avec solutions, coûts et professionnels recommandés dans ${SEO_CITIES.length}+ villes du Québec.`,
    numberOfItems: SEO_PROBLEMS.length,
  };

  return (
    <MainLayout>
      <Helmet>
        <title>Problèmes résidentiels courants au Québec | UNPRO</title>
        <meta name="description" content={`Guide complet de ${SEO_PROBLEMS.length}+ problèmes résidentiels au Québec : causes, solutions, coûts estimés et professionnels vérifiés dans ${SEO_CITIES.length}+ villes.`} />
        <link rel="canonical" href="https://unpro.ca/problemes" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <article className="premium-bg">
        {/* Hero */}
        <div className="relative hero-gradient noise-overlay overflow-hidden">
          <div className="relative z-10 max-w-3xl mx-auto px-5 pt-8 pb-16 md:pt-12 md:pb-24 space-y-5">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="outline" className="text-xs mb-3">
                {SEO_PROBLEMS.length} problèmes · {SEO_CITIES.length} villes · {totalPages.toLocaleString("fr-CA")} pages
              </Badge>
              <h1 className="text-2xl md:text-4xl font-extrabold text-foreground leading-tight tracking-tight">
                Problèmes résidentiels courants au Québec
              </h1>
              <p className="text-base text-muted-foreground mt-3 max-w-lg leading-relaxed">
                Identifiez votre problème, comprenez les causes et trouvez le bon professionnel vérifié. Contenu éducatif et transparent — aucune information inventée.
              </p>
            </motion.div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un problème…"
                className="pl-9 bg-card/80 backdrop-blur-sm border-border/50"
              />
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-5 space-y-8 pb-16 -mt-6">
          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(null)}
              className="text-xs"
            >
              Tous ({SEO_PROBLEMS.length})
            </Button>
            {PROBLEM_CATEGORIES.map((cat) => {
              const count = SEO_PROBLEMS.filter((p) => p.contractorTypes.some((t) => cat.types.includes(t))).length;
              if (count === 0) return null;
              const Icon = cat.icon;
              return (
                <Button
                  key={cat.key}
                  variant={activeCategory === cat.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
                  className="text-xs gap-1"
                >
                  <Icon className="h-3 w-3" />
                  {cat.labelFr} ({count})
                </Button>
              );
            })}
          </div>

          {/* Problem grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProblems.map((problem) => (
              <ProblemCard key={problem.slug} problem={problem} />
            ))}
          </div>

          {filteredProblems.length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Aucun problème trouvé pour cette recherche.</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Problèmes documentés", value: SEO_PROBLEMS.length.toString() },
              { label: "Villes couvertes", value: `${SEO_CITIES.length}+` },
              { label: "Pages générées", value: totalPages.toLocaleString("fr-CA") },
              { label: "Types de pros", value: contractorTypes.length.toString() },
            ].map((s) => (
              <Card key={s.label} className="border-border/30">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* City navigation */}
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Explorer par ville
            </h2>
            <div className="flex flex-wrap gap-2">
              {SEO_CITIES.slice(0, 20).map((city) => (
                <Link key={city.slug} to={`/ville/${city.slug}`}>
                  <Badge variant="outline" className="hover:bg-primary/5 cursor-pointer transition-colors text-xs">
                    {city.name}
                  </Badge>
                </Link>
              ))}
              {SEO_CITIES.length > 20 && (
                <Badge variant="secondary" className="text-xs">+{SEO_CITIES.length - 20} villes</Badge>
              )}
            </div>
          </section>

          {/* CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-5 text-center space-y-2">
                <h3 className="text-sm font-bold text-foreground">Parler à Alex</h3>
                <p className="text-xs text-muted-foreground">Notre concierge IA vous aide à identifier votre problème.</p>
                <Button size="sm" variant="default" onClick={() => alexVoice.openAlex("general")}>
                  Démarrer <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
            <Card className="border-border/30">
              <CardContent className="p-5 text-center space-y-2">
                <h3 className="text-sm font-bold text-foreground">Trouver un entrepreneur</h3>
                <p className="text-xs text-muted-foreground">Recherchez parmi nos entrepreneurs vérifiés.</p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/search">Rechercher <ArrowRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-border/30">
              <CardContent className="p-5 text-center space-y-2">
                <h3 className="text-sm font-bold text-foreground">Vérifier un entrepreneur</h3>
                <p className="text-xs text-muted-foreground">Validez les licences et assurances de votre entrepreneur.</p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/verify">Vérifier <ArrowRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </article>
    </MainLayout>
  );
}

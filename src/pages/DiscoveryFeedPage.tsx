/**
 * Discovery Feed — TikTok/Pinterest-style renovation transformation gallery.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Bookmark, Share2, Eye, Vote, Sparkles, TrendingUp,
  Clock, Award, ChevronRight, Camera, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGrowthFeed, RenovationProject } from "@/hooks/useGrowthFeed";
import { useAuth } from "@/hooks/useAuth";

const CATEGORIES = [
  { key: "all", label: "Tout", emoji: "🏠" },
  { key: "kitchen", label: "Cuisine", emoji: "🍳" },
  { key: "bathroom", label: "Salle de bain", emoji: "🛁" },
  { key: "facade", label: "Façade", emoji: "🏗️" },
  { key: "backyard", label: "Cour", emoji: "🌿" },
  { key: "basement", label: "Sous-sol", emoji: "🏚️" },
  { key: "living room", label: "Salon", emoji: "🛋️" },
  { key: "pool", label: "Piscine", emoji: "🏊" },
  { key: "deck", label: "Terrasse", emoji: "🪵" },
  { key: "landscaping", label: "Paysagement", emoji: "🌳" },
  { key: "roof", label: "Toiture", emoji: "🏠" },
  { key: "paint colors", label: "Peinture", emoji: "🎨" },
];

const CATEGORY_FR: Record<string, string> = {
  kitchen: "Cuisine", bathroom: "Salle de bain", basement: "Sous-sol",
  "living room": "Salon", bedroom: "Chambre", facade: "Façade",
  roof: "Toiture", "paint colors": "Peinture", backyard: "Cour arrière",
  pool: "Piscine", deck: "Terrasse", landscaping: "Aménagement paysager",
  garage: "Garage", driveway: "Entrée", fence: "Clôture", "outdoor lighting": "Éclairage",
};

type FilterType = "trending" | "recent" | "top_week" | "top_month";

const DiscoveryFeedPage = () => {
  const [filter, setFilter] = useState<FilterType>("trending");
  const [activeCategory, setActiveCategory] = useState("all");
  const { isAuthenticated } = useAuth();

  const { projects, isLoading, like, save } = useGrowthFeed(
    filter,
    activeCategory === "all" ? undefined : activeCategory
  );

  const shareProject = (project: RenovationProject) => {
    const catFr = CATEGORY_FR[project.category] || project.category;
    const text = `Je pense refaire ma ${catFr.toLowerCase()}. Quelle version préférez-vous ?`;
    const url = `${window.location.origin}/transformations/${project.slug || project.id}`;
    if (navigator.share) {
      navigator.share({ title: `Transformation ${catFr}`, text, url });
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
              >
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-foreground text-lg hidden sm:block">Inspirations</span>
            </Link>
          </div>
          <Link to="/alex/renovation">
            <Button size="sm" className="rounded-full gap-2"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
            >
              <Camera className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Créer mon projet</span>
              <span className="sm:hidden">Créer</span>
            </Button>
          </Link>
        </div>

        {/* Category pills */}
        <div className="max-w-7xl mx-auto px-4 pb-3 overflow-x-auto scrollbar-none">
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  activeCategory === cat.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="max-w-7xl mx-auto px-4 pb-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList className="h-8 bg-muted/30">
              <TabsTrigger value="trending" className="text-xs gap-1 h-7"><TrendingUp className="h-3 w-3" /> Tendances</TabsTrigger>
              <TabsTrigger value="recent" className="text-xs gap-1 h-7"><Clock className="h-3 w-3" /> Récents</TabsTrigger>
              <TabsTrigger value="top_week" className="text-xs gap-1 h-7"><Award className="h-3 w-3" /> Top semaine</TabsTrigger>
              <TabsTrigger value="top_month" className="text-xs gap-1 h-7">Top mois</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Feed grid */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-muted/30 animate-pulse h-80" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, i) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={i}
                onLike={() => like(project.id)}
                onSave={() => save(project.id)}
                onShare={() => shareProject(project)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating CTA */}
      <div className="fixed bottom-6 right-6 z-40">
        <Link to="/alex/renovation">
          <Button size="lg" className="rounded-full shadow-xl gap-2 h-14 px-6"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))",
              boxShadow: "0 8px 32px hsl(var(--primary) / 0.3)",
            }}
          >
            <Camera className="h-5 w-5" />
            Transformer mon espace
          </Button>
        </Link>
      </div>
    </div>
  );
};

const ProjectCard = ({
  project,
  index,
  onLike,
  onSave,
  onShare,
}: {
  project: RenovationProject;
  index: number;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
}) => {
  const [showAfter, setShowAfter] = useState(true);
  const mainConcept = project.concepts[0];
  const catFr = CATEGORY_FR[project.category] || project.category;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="group rounded-2xl overflow-hidden bg-card border border-border/40 hover:shadow-xl transition-all duration-300"
    >
      {/* Image area with before/after toggle */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* Show concept or original */}
        <div className="absolute inset-0">
          {showAfter && mainConcept?.image_url ? (
            <img src={mainConcept.image_url} alt="Après" className="w-full h-full object-cover" />
          ) : project.original_image_url ? (
            <img src={project.original_image_url} alt="Avant" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <Sparkles className="h-12 w-12 text-primary/40" />
            </div>
          )}
        </div>

        {/* Before/After toggle */}
        {project.original_image_url && mainConcept?.image_url && (
          <div className="absolute top-3 left-3 flex rounded-full bg-background/80 backdrop-blur-sm border border-border/40 overflow-hidden">
            <button
              onClick={(e) => { e.preventDefault(); setShowAfter(false); }}
              className={`px-3 py-1 text-[10px] font-bold transition-all ${
                !showAfter ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              AVANT
            </button>
            <button
              onClick={(e) => { e.preventDefault(); setShowAfter(true); }}
              className={`px-3 py-1 text-[10px] font-bold transition-all ${
                showAfter ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              APRÈS
            </button>
          </div>
        )}

        {/* Category badge */}
        <Badge className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm text-foreground border-border/40 text-[10px]">
          {catFr}
        </Badge>

        {/* Gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Bottom info */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            {project.city && (
              <p className="text-[10px] text-white/70 font-medium">{project.city}</p>
            )}
            {project.budget && (
              <p className="text-xs text-white font-bold">{project.budget}</p>
            )}
          </div>
          <div className="flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1">
            <Vote className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-bold text-foreground">{project.vote_count}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {project.project_summary && (
          <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
            {project.project_summary}
          </p>
        )}

        {/* Concept thumbnails */}
        {project.concepts.length > 1 && (
          <div className="flex gap-1.5">
            {project.concepts.slice(0, 3).map((concept, i) => (
              <div key={concept.id} className="relative flex-1 aspect-square rounded-lg overflow-hidden border border-border/40">
                {concept.image_url ? (
                  <img src={concept.image_url} alt={`Option ${i + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted/30" />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                  <p className="text-[8px] text-white font-bold text-center">
                    {concept.concept_type === "safe" ? "Sobre" : concept.concept_type === "premium" ? "Premium" : "Équilibré"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.preventDefault(); onLike(); }}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-colors"
            >
              <Heart className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
            </button>
            <button onClick={(e) => { e.preventDefault(); onSave(); }}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-primary/10 transition-colors"
            >
              <Bookmark className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
            </button>
            <button onClick={(e) => { e.preventDefault(); onShare(); }}
              className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-primary/10 transition-colors"
            >
              <Share2 className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Link to={`/transformations/${project.slug || project.id}`}>
              <Button variant="ghost" size="sm" className="text-xs h-7 rounded-full gap-1">
                Voter <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
            <Link to={`/alex/renovation`}>
              <Button size="sm" className="text-xs h-7 rounded-full gap-1"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
              >
                <Camera className="h-3 w-3" /> Ma version
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center text-center py-20 space-y-6 max-w-md mx-auto"
  >
    <div className="h-24 w-24 rounded-full flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--secondary) / 0.1))",
      }}
    >
      <Sparkles className="h-10 w-10 text-primary" />
    </div>
    <div className="space-y-2">
      <h2 className="text-2xl font-display font-bold text-foreground">Aucune transformation encore</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Soyez le premier à créer une transformation de votre espace et partagez-la avec la communauté.
      </p>
    </div>
    <Link to="/alex/renovation">
      <Button size="lg" className="rounded-full gap-2"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
      >
        <Camera className="h-5 w-5" />
        Créer ma première transformation
      </Button>
    </Link>
  </motion.div>
);

export default DiscoveryFeedPage;

/**
 * DiscoveryFeedPage — Premium Inspirations module with dual theme, tabs, before/after autoplay,
 * working votes, and contextual contractor CTA via Alex.
 */
import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sparkles, TrendingUp, Clock, Award, Camera, Search, Folder, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGrowthFeed, RenovationProject } from "@/hooks/useGrowthFeed";
import { useAuth } from "@/hooks/useAuth";
import { useInspirationTheme } from "@/hooks/useInspirationTheme";
import ThemeToggleInspirations from "@/components/inspirations/ThemeToggleInspirations";
import CardInspirationBeforeAfter, { type InspirationCardData } from "@/components/inspirations/CardInspirationBeforeAfter";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "all", label: "Tout", emoji: "🏠" },
  { key: "kitchen", label: "Cuisine", emoji: "🍳" },
  { key: "bathroom", label: "Salle de bain", emoji: "🛁" },
  { key: "facade", label: "Façade", emoji: "🏗️" },
  { key: "living room", label: "Salon", emoji: "🛋️" },
  { key: "basement", label: "Sous-sol", emoji: "🏚️" },
  { key: "backyard", label: "Cour", emoji: "🌿" },
  { key: "deck", label: "Terrasse", emoji: "🪵" },
  { key: "pool", label: "Piscine", emoji: "🏊" },
  { key: "landscaping", label: "Paysagement", emoji: "🌳" },
  { key: "roof", label: "Toiture", emoji: "🏠" },
];

type TabKey = "ideas" | "projects" | "my_projects";
type FilterType = "trending" | "recent" | "top_week" | "top_month";

const DiscoveryFeedPage = () => {
  const [tab, setTab] = useState<TabKey>("ideas");
  const [filter, setFilter] = useState<FilterType>("trending");
  const [activeCategory, setActiveCategory] = useState("all");
  const { isAuthenticated } = useAuth();
  const { isDark, setIsDark } = useInspirationTheme();
  const navigate = useNavigate();

  const { projects, isLoading, like, save, vote } = useGrowthFeed(
    filter,
    activeCategory === "all" ? undefined : activeCategory
  );

  const handleVote = useCallback((project: RenovationProject) => {
    if (!isAuthenticated) {
      toast.info("Connectez-vous pour voter et enregistrer vos inspirations.");
      return;
    }
    const concept = project.concepts[0];
    if (concept) {
      vote({ projectId: project.id, conceptId: concept.id });
    }
  }, [isAuthenticated, vote]);

  const handleMyVersion = useCallback((project: RenovationProject) => {
    const params = new URLSearchParams();
    if (project.category) params.set("room", project.category);
    if (project.budget) params.set("budget", project.budget);
    navigate(`/alex/renovation?${params.toString()}`);
  }, [navigate]);

  const handleFindContractor = useCallback(() => {
    navigate("/alex/chat?intent=find_contractor_from_inspiration");
  }, [navigate]);

  const handleShare = useCallback((project: RenovationProject) => {
    const url = `${window.location.origin}/transformations/${project.slug || project.id}`;
    const text = "Regarde cette transformation!";
    if (navigator.share) {
      navigator.share({ title: project.project_summary || "Transformation", text, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Lien copié !");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/40"
        style={{ background: "hsl(var(--background) / 0.85)", backdropFilter: "blur(20px)" }}
      >
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
          <div className="flex items-center gap-2">
            <ThemeToggleInspirations isDark={isDark} onChange={setIsDark} />
            <Link to="/alex/renovation">
              <Button size="sm" className="rounded-full gap-1.5 active:scale-95 transition-transform"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Créer</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Tabs: Idées / Projets / Mes projets */}
        <div className="max-w-7xl mx-auto px-4 pb-2">
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
            <TabsList className="h-9 bg-muted/30 w-full sm:w-auto">
              <TabsTrigger value="ideas" className="text-xs gap-1.5 flex-1 sm:flex-none">
                <Sparkles className="h-3 w-3" /> Idées
              </TabsTrigger>
              <TabsTrigger value="projects" className="text-xs gap-1.5 flex-1 sm:flex-none">
                <Folder className="h-3 w-3" /> Projets
              </TabsTrigger>
              <TabsTrigger value="my_projects" className="text-xs gap-1.5 flex-1 sm:flex-none">
                <Camera className="h-3 w-3" /> Mes projets
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Category pills (only for Ideas tab) */}
        {tab === "ideas" && (
          <div className="max-w-7xl mx-auto px-4 pb-2 overflow-x-auto scrollbar-none">
            <div className="flex gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
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
        )}

        {/* Sort filter (Ideas tab only) */}
        {tab === "ideas" && (
          <div className="max-w-7xl mx-auto px-4 pb-2">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {([
                { key: "trending", icon: TrendingUp, label: "Tendances" },
                { key: "recent", icon: Clock, label: "Récents" },
                { key: "top_week", icon: Award, label: "Top semaine" },
                { key: "top_month", icon: null, label: "Top mois" },
              ] as const).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                    filter === f.key
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.icon && <f.icon className="h-3 w-3" />}
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === "ideas" && (
          <IdeasFeed
            projects={projects}
            isLoading={isLoading}
            onVote={handleVote}
            onSave={(p) => like(p.id)}
            onShare={handleShare}
            onMyVersion={handleMyVersion}
          />
        )}
        {tab === "projects" && <ProjectsTab />}
        {tab === "my_projects" && <MyProjectsTab isAuthenticated={isAuthenticated} />}
      </main>

      {/* Bottom CTA — Find contractor (replaces "Transformer mon espace") */}
      {tab === "ideas" && projects.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-auto z-40">
          <Button
            size="lg"
            className="w-full sm:w-auto rounded-full gap-2 h-12 px-6 font-semibold active:scale-95 transition-transform"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))",
              boxShadow: "0 8px 32px hsl(var(--primary) / 0.3)",
            }}
            onClick={handleFindContractor}
          >
            <Search className="h-4 w-4" />
            Trouver un entrepreneur
          </Button>
        </div>
      )}
    </div>
  );
};

/* ─── Ideas Feed ─── */
function IdeasFeed({
  projects, isLoading, onVote, onSave, onShare, onMyVersion,
}: {
  projects: RenovationProject[];
  isLoading: boolean;
  onVote: (p: RenovationProject) => void;
  onSave: (p: RenovationProject) => void;
  onShare: (p: RenovationProject) => void;
  onMyVersion: (p: RenovationProject) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-muted/30 animate-pulse aspect-[4/3]" />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`b-${i}`} className="rounded-2xl bg-muted/20 animate-pulse h-16 mt-[-1rem]" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return <EmptyIdeas />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
      {projects.map((project, i) => (
        <CardInspirationBeforeAfter
          key={project.id}
          data={project as InspirationCardData}
          index={i}
          onVote={() => onVote(project)}
          onSave={() => onSave(project)}
          onShare={() => onShare(project)}
          onMyVersion={() => onMyVersion(project)}
        />
      ))}
    </div>
  );
}

/* ─── Projects Tab ─── */
function ProjectsTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center py-16 space-y-5 max-w-sm mx-auto"
    >
      <div className="h-20 w-20 rounded-2xl flex items-center justify-center bg-primary/10">
        <Folder className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-display font-bold text-foreground">Projets communautaires</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Les projets créés à partir d'inspirations apparaîtront ici. Créez votre version d'une idée pour démarrer.
        </p>
      </div>
      <Link to="/alex/renovation">
        <Button className="rounded-full gap-2"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
        >
          <Plus className="h-4 w-4" /> Créer un projet
        </Button>
      </Link>
    </motion.div>
  );
}

/* ─── My Projects Tab ─── */
function MyProjectsTab({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (!isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center py-16 space-y-5 max-w-sm mx-auto"
      >
        <div className="h-20 w-20 rounded-2xl flex items-center justify-center bg-primary/10">
          <Camera className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-display font-bold text-foreground">Mes projets</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Connectez-vous pour voir et gérer vos projets personnels.
          </p>
        </div>
        <Link to="/login">
          <Button className="rounded-full gap-2"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
          >
            Se connecter
          </Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center py-16 space-y-5 max-w-sm mx-auto"
    >
      <div className="h-20 w-20 rounded-2xl flex items-center justify-center bg-primary/10">
        <Camera className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-display font-bold text-foreground">Aucun projet encore</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Créez votre première version personnalisée d'une inspiration pour la retrouver ici.
        </p>
      </div>
      <Link to="/inspirations">
        <Button variant="outline" className="rounded-full gap-2" onClick={() => {}}>
          <Sparkles className="h-4 w-4" /> Voir les idées
        </Button>
      </Link>
    </motion.div>
  );
}

/* ─── Empty Ideas ─── */
function EmptyIdeas() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center text-center py-20 space-y-6 max-w-md mx-auto"
    >
      <div className="h-24 w-24 rounded-full flex items-center justify-center bg-primary/10">
        <Sparkles className="h-10 w-10 text-primary" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-display font-bold text-foreground">Aucune inspiration encore</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Soyez le premier à créer une transformation et partagez-la avec la communauté.
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
}

export default DiscoveryFeedPage;

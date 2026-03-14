/**
 * Transformation Detail — Public voting page for a renovation project.
 * Shows original, 3 concepts, voting, sharing, and contractor CTA.
 */
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Vote, Share2, Heart, Bookmark, Camera, Users, ChevronRight,
  Sparkles, Check, ArrowLeft, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useGrowthFeed, RenovationProject, RenovationConcept } from "@/hooks/useGrowthFeed";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";

const CATEGORY_FR: Record<string, string> = {
  kitchen: "Cuisine", bathroom: "Salle de bain", basement: "Sous-sol",
  "living room": "Salon", bedroom: "Chambre", facade: "Façade",
  roof: "Toiture", "paint colors": "Peinture", backyard: "Cour arrière",
  pool: "Piscine", deck: "Terrasse", landscaping: "Aménagement paysager",
};

const CONCEPT_LABELS: Record<string, { fr: string; color: string }> = {
  safe: { fr: "Sobre & Réaliste", color: "hsl(var(--success))" },
  balanced: { fr: "Équilibré", color: "hsl(var(--primary))" },
  premium: { fr: "Premium", color: "hsl(var(--secondary))" },
};

const TransformationDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const { vote, getProject, isVoting } = useGrowthFeed();
  const [votedConcept, setVotedConcept] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);

  const { data: project, isLoading } = useQuery({
    queryKey: ["project-detail", id],
    queryFn: () => getProject(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Projet non trouvé</p>
          <Link to="/inspirations"><Button variant="outline">Retour aux inspirations</Button></Link>
        </div>
      </div>
    );
  }

  const catFr = CATEGORY_FR[project.category] || project.category;
  const title = `Transformation ${catFr}${project.city ? ` à ${project.city}` : ""} — UNPRO`;

  const handleVote = (conceptId: string) => {
    if (votedConcept) return;
    setVotedConcept(conceptId);
    vote({ projectId: project.id, conceptId });
  };

  const shareProject = () => {
    const text = `Je pense refaire ma ${catFr.toLowerCase()}. Quelle version préférez-vous ?`;
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `Transformation ${catFr}`, text, url });
    } else {
      navigator.clipboard.writeText(`${text}\n${url}`);
    }
  };

  const totalVotes = project.concepts.reduce((sum, c) => sum + c.vote_count, 0) + (votedConcept ? 1 : 0);

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={`Votez pour votre concept de transformation ${catFr.toLowerCase()} préféré. ${project.project_summary || ""}`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/inspirations" className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </Link>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{catFr}</Badge>
              {project.city && <Badge variant="outline" className="text-xs">{project.city}</Badge>}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={shareProject}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
          {/* Title */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Transformation {catFr}
            </h1>
            {project.project_summary && (
              <p className="text-muted-foreground text-sm max-w-lg mx-auto">{project.project_summary}</p>
            )}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Vote className="h-3 w-3" /> {totalVotes} votes</span>
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {project.view_count} vues</span>
            </div>
          </motion.div>

          {/* Before/After Slider */}
          {project.original_image_url && project.concepts[0]?.image_url && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
              className="relative rounded-2xl overflow-hidden border border-border/40 shadow-lg aspect-[16/10]"
            >
              <img src={project.concepts[0].image_url} alt="Après" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPosition}%` }}>
                <img src={project.original_image_url} alt="Avant" className="w-full h-full object-cover" style={{ minWidth: "100vw", maxWidth: "none", width: `${10000 / sliderPosition}%` }} />
              </div>
              <div className="absolute inset-0" style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}>
                <div className="w-1 h-full bg-white shadow-lg" />
              </div>
              <input
                type="range" min="0" max="100" value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
              />
              <Badge className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-foreground text-[10px]">AVANT</Badge>
              <Badge className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm text-foreground text-[10px]">APRÈS</Badge>
            </motion.div>
          )}

          {/* Voting section */}
          <div className="space-y-4">
            <h2 className="text-lg font-display font-bold text-foreground text-center">
              {votedConcept ? "Merci pour votre vote !" : "Quelle version préférez-vous ?"}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {project.concepts.map((concept, i) => (
                <ConceptVoteCard
                  key={concept.id}
                  concept={concept}
                  index={i}
                  isVoted={votedConcept === concept.id}
                  hasVoted={!!votedConcept}
                  totalVotes={totalVotes}
                  onVote={() => handleVote(concept.id)}
                />
              ))}
            </div>
          </div>

          {/* Budget summary */}
          {project.budget && (
            <Card className="border-border/40">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "hsl(var(--primary) / 0.1)" }}
                >
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Budget estimé</p>
                  <p className="text-xs text-muted-foreground">{project.budget} · {project.style || "Personnalisé"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* CTAs */}
          <div className="space-y-3">
            <Link to="/alex/renovation" className="block">
              <Card className="border-2 border-primary/20 hover:border-primary/40 transition-all group cursor-pointer"
                style={{ background: "hsl(var(--primary) / 0.03)" }}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
                  >
                    <Camera className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      Créer ma propre version
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Téléversez votre photo et obtenez vos concepts personnalisés
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>

            <Link to="/search" className="block">
              <Card className="border-border/40 hover:shadow-md transition-all group cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "hsl(var(--success) / 0.1)" }}
                  >
                    <Users className="h-6 w-6 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      Trouver des entrepreneurs
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Professionnels vérifiés pour {catFr.toLowerCase()}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>

            {!isAuthenticated && (
              <Link to="/signup" className="block">
                <Card className="border-border/40 hover:shadow-md transition-all group cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-muted/50">
                      <Bookmark className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-foreground">Créer un compte gratuit</p>
                      <p className="text-xs text-muted-foreground">
                        Sauvegardez vos idées, budgets et entrepreneurs recommandés
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>

          {/* Share CTA */}
          <div className="text-center py-6">
            <Button variant="outline" onClick={shareProject} className="rounded-full gap-2">
              <Share2 className="h-4 w-4" />
              Partager cette transformation
            </Button>
          </div>
        </main>
      </div>
    </>
  );
};

const ConceptVoteCard = ({
  concept, index, isVoted, hasVoted, totalVotes, onVote,
}: {
  concept: RenovationConcept;
  index: number;
  isVoted: boolean;
  hasVoted: boolean;
  totalVotes: number;
  onVote: () => void;
}) => {
  const config = CONCEPT_LABELS[concept.concept_type] || CONCEPT_LABELS.balanced;
  const votes = concept.vote_count + (isVoted ? 1 : 0);
  const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`rounded-2xl overflow-hidden border transition-all ${
        isVoted ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border/40 hover:border-primary/30"
      }`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {concept.image_url ? (
          <img src={concept.image_url} alt={config.fr} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary/30" />
          </div>
        )}
        <Badge className="absolute top-2 left-2 text-[10px]" style={{ background: config.color, color: "white" }}>
          {config.fr}
        </Badge>
      </div>

      {/* Vote area */}
      <div className="p-3 space-y-2">
        {concept.title && <p className="text-xs font-semibold text-foreground line-clamp-1">{concept.title}</p>}

        {concept.estimated_budget_min && concept.estimated_budget_max && (
          <p className="text-[10px] text-muted-foreground">
            {(concept.estimated_budget_min / 100).toLocaleString("fr-CA")}$ — {(concept.estimated_budget_max / 100).toLocaleString("fr-CA")}$
          </p>
        )}

        {hasVoted ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">{pct}%</span>
              <span className="text-muted-foreground">{votes} votes</span>
            </div>
            <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="h-full rounded-full"
                style={{ background: isVoted ? config.color : "hsl(var(--muted-foreground) / 0.3)" }}
              />
            </div>
          </div>
        ) : (
          <Button
            onClick={onVote}
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 rounded-full gap-1 hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <Vote className="h-3 w-3" /> Voter
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default TransformationDetailPage;

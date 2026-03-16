/**
 * UNPRO Design — Public Share/Vote Page
 * Accessed via /design/share/:token
 * Allows anonymous voting and commenting on design versions
 */
import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ThumbsUp, ThumbsDown, MessageCircle, Trophy, Sparkles, ArrowLeft, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const DESIGN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/design-generate`;

interface SharedVersion {
  id: string;
  version_number: string;
  image_url: string | null;
  prompt_used: string;
  style_label: string | null;
  budget_mode: string | null;
  frozen: boolean;
  vote_counts: { love: number; like: number; nope: number };
}

interface SharedProject {
  title: string;
  room_type: string | null;
  original_image_url: string | null;
  versions: SharedVersion[];
  privacy_type: string;
}

export default function DesignSharePage() {
  const { token } = useParams<{ token: string }>();
  const [project, setProject] = useState<SharedProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voterName, setVoterName] = useState("");
  const [submittingVote, setSubmittingVote] = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, string>>({});
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [hasEnteredName, setHasEnteredName] = useState(false);

  // Fingerprint for vote uniqueness
  const fingerprint = useCallback(() => {
    const nav = navigator;
    return btoa(`${nav.userAgent}-${nav.language}-${screen.width}x${screen.height}-${new Date().getTimezoneOffset()}`).slice(0, 32);
  }, []);

  const fetchProject = useCallback(async () => {
    if (!token) return;
    try {
      const resp = await fetch(DESIGN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get_shared_project", shareToken: token }),
      });
      if (!resp.ok) {
        setError("Ce lien de partage est invalide ou a expiré.");
        return;
      }
      const data = await resp.json();
      setProject(data.project);
    } catch {
      setError("Impossible de charger le projet.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleVote = async (versionId: string, voteType: "love" | "like" | "nope") => {
    if (!voterName.trim()) {
      setHasEnteredName(false);
      toast({ title: "Entrez votre prénom", description: "Pour voter, indiquez votre prénom." });
      return;
    }
    setSubmittingVote(versionId);
    try {
      const resp = await fetch(DESIGN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cast_vote",
          shareToken: token,
          versionId,
          voterName: voterName.trim(),
          voteType,
          fingerprint: fingerprint(),
          comment: commentingId === versionId && commentText.trim() ? commentText.trim() : null,
        }),
      });
      if (resp.ok) {
        setUserVotes((prev) => ({ ...prev, [versionId]: voteType }));
        setCommentText("");
        setCommentingId(null);
        toast({ title: "Vote enregistré !", description: `Vous avez voté "${voteType === "love" ? "J'adore" : voteType === "like" ? "Bien" : "Pas pour moi"}"` });
        fetchProject(); // Refresh counts
      } else {
        const data = await resp.json().catch(() => ({}));
        toast({ title: "Erreur", description: data.error || "Vote non enregistré.", variant: "destructive" });
      }
    } finally {
      setSubmittingVote(null);
    }
  };

  const mostLoved = project?.versions
    ?.filter((v) => v.image_url)
    .sort((a, b) => (b.vote_counts?.love || 0) - (a.vote_counts?.love || 0))[0];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6 text-center">
        <Sparkles className="w-8 h-8 text-muted-foreground" />
        <h1 className="font-display text-lg font-semibold text-foreground">Lien invalide</h1>
        <p className="text-sm text-muted-foreground max-w-sm">{error || "Ce projet n'existe pas."}</p>
        <Link to="/design">
          <Button size="sm" variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Créer mon design
          </Button>
        </Link>
      </div>
    );
  }

  const versionsWithImages = project.versions.filter((v) => v.image_url);

  return (
    <>
      <Helmet>
        <title>{project.title} — UNPRO Design</title>
        <meta name="description" content="Votez pour votre design de rénovation préféré sur UNPRO Design." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-display font-semibold text-sm text-foreground">UNPRO Design</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {versionsWithImages.length} version{versionsWithImages.length > 1 ? "s" : ""}
            </Badge>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Project info */}
          <div className="text-center space-y-2">
            <h1 className="font-display text-xl font-bold text-foreground">{project.title}</h1>
            <p className="text-sm text-muted-foreground">
              Votez pour votre version préférée et aidez à choisir le design final.
            </p>
          </div>

          {/* Voter name input */}
          {!hasEnteredName ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xs mx-auto space-y-3"
            >
              <p className="text-xs text-muted-foreground text-center">Entrez votre prénom pour voter</p>
              <div className="flex gap-2">
                <Input
                  value={voterName}
                  onChange={(e) => setVoterName(e.target.value)}
                  placeholder="Votre prénom"
                  className="text-sm"
                  onKeyDown={(e) => e.key === "Enter" && voterName.trim() && setHasEnteredName(true)}
                />
                <Button
                  size="sm"
                  onClick={() => voterName.trim() && setHasEnteredName(true)}
                  disabled={!voterName.trim()}
                >
                  OK
                </Button>
              </div>
            </motion.div>
          ) : (
            <div className="text-center">
              <Badge variant="outline" className="text-xs gap-1">
                Vous votez en tant que <span className="font-semibold">{voterName}</span>
              </Badge>
            </div>
          )}

          {/* Original photo */}
          {project.original_image_url && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Photo originale</p>
              <div className="rounded-xl overflow-hidden border border-border max-h-48">
                <img
                  src={project.original_image_url}
                  alt="Original"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          )}

          {/* Versions grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {versionsWithImages.map((v) => {
              const isMostLoved = mostLoved?.id === v.id && (v.vote_counts?.love || 0) > 0;
              const totalVotes = (v.vote_counts?.love || 0) + (v.vote_counts?.like || 0) + (v.vote_counts?.nope || 0);

              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border bg-card overflow-hidden"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3]">
                    <img
                      src={v.image_url!}
                      alt={`V${v.version_number}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      <Badge variant="secondary" className="text-xs font-mono bg-background/80 backdrop-blur-sm">
                        V{v.version_number}
                      </Badge>
                      {isMostLoved && (
                        <Badge className="text-xs bg-red-500/20 text-red-400 backdrop-blur-sm gap-1">
                          <Trophy className="w-3 h-3" />
                          Favori
                        </Badge>
                      )}
                    </div>
                    {userVotes[v.id] && (
                      <div className="absolute top-2 right-2">
                        <Badge className="text-xs bg-background/80 backdrop-blur-sm">
                          {userVotes[v.id] === "love" ? "❤️" : userVotes[v.id] === "like" ? "👍" : "👎"}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-2.5">
                    {v.style_label && (
                      <p className="text-xs font-medium text-foreground">{v.style_label}</p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">{v.prompt_used}</p>

                    {/* Vote counts */}
                    {totalVotes > 0 && (
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        {v.vote_counts.love > 0 && <span>❤️ {v.vote_counts.love}</span>}
                        {v.vote_counts.like > 0 && <span>👍 {v.vote_counts.like}</span>}
                        {v.vote_counts.nope > 0 && <span>👎 {v.vote_counts.nope}</span>}
                      </div>
                    )}

                    {/* Vote buttons */}
                    <div className="flex items-center gap-1.5">
                      {(["love", "like", "nope"] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => hasEnteredName && handleVote(v.id, type)}
                          disabled={submittingVote === v.id || !hasEnteredName}
                          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                            userVotes[v.id] === type
                              ? type === "love"
                                ? "bg-red-500/15 text-red-400"
                                : type === "like"
                                ? "bg-green-500/15 text-green-400"
                                : "bg-muted text-muted-foreground"
                              : "bg-muted/50 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {type === "love" && <Heart className="w-3.5 h-3.5" />}
                          {type === "like" && <ThumbsUp className="w-3.5 h-3.5" />}
                          {type === "nope" && <ThumbsDown className="w-3.5 h-3.5" />}
                          {type === "love" ? "J'adore" : type === "like" ? "Bien" : "Non"}
                        </button>
                      ))}
                    </div>

                    {/* Comment toggle */}
                    <button
                      onClick={() => setCommentingId(commentingId === v.id ? null : v.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Ajouter un commentaire
                    </button>

                    {/* Comment input */}
                    <AnimatePresence>
                      {commentingId === v.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex gap-1.5 pt-1">
                            <Textarea
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder="Votre commentaire..."
                              className="text-xs min-h-[60px] resize-none"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {versionsWithImages.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <Sparkles className="w-6 h-6 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">Aucune version générée pour le moment.</p>
            </div>
          )}

          {/* CTA */}
          <div className="text-center pt-4 pb-8">
            <Link to="/design">
              <Button variant="outline" size="sm" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Créer mon propre design
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

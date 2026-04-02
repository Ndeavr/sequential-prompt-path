/**
 * CardInspirationBeforeAfter — Premium inspiration card with autoplay before/after.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Bookmark, Share2, Camera, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface InspirationCardData {
  id: string;
  title?: string;
  description?: string;
  room_type?: string;
  style_tags?: string[];
  budget_label?: string;
  budget_min?: number;
  budget_max?: number;
  before_image_url?: string | null;
  after_image_url?: string | null;
  cover_image_url?: string | null;
  votes_count?: number;
  saves_count?: number;
  slug?: string;
  // From renovation_projects compat
  original_image_url?: string | null;
  project_summary?: string | null;
  category?: string;
  city?: string;
  budget?: string;
  vote_count?: number;
  concepts?: { id: string; image_url?: string | null; concept_type?: string }[];
}

interface CardProps {
  data: InspirationCardData;
  index?: number;
  onVote?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onMyVersion?: () => void;
  hasVoted?: boolean;
  hasSaved?: boolean;
}

const ROOM_LABELS: Record<string, string> = {
  kitchen: "Cuisine", bathroom: "Salle de bain", living_room: "Salon",
  "living room": "Salon", bedroom: "Chambre", basement: "Sous-sol",
  facade: "Façade", backyard: "Cour", deck: "Terrasse",
  pool: "Piscine", landscaping: "Paysagement", roof: "Toiture",
  "paint colors": "Peinture", garage: "Garage",
};

export default function CardInspirationBeforeAfter({
  data, index = 0, onVote, onSave, onShare, onMyVersion, hasVoted, hasSaved,
}: CardProps) {
  const [showAfter, setShowAfter] = useState(true);
  const [paused, setPaused] = useState(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const beforeImg = data.before_image_url || data.original_image_url;
  const afterImg = data.after_image_url || data.concepts?.[0]?.image_url || data.cover_image_url;
  const hasBeforeAfter = !!beforeImg && !!afterImg;
  const roomLabel = ROOM_LABELS[data.room_type || data.category || ""] || data.room_type || data.category;
  const budgetText = data.budget_label || data.budget;
  const voteCount = data.votes_count ?? data.vote_count ?? 0;
  const desc = data.description || data.project_summary;

  // Autoplay before/after every 4.5s
  useEffect(() => {
    if (!hasBeforeAfter || paused) return;
    intervalRef.current = setInterval(() => {
      setShowAfter((prev) => !prev);
    }, 4500);
    return () => clearInterval(intervalRef.current);
  }, [hasBeforeAfter, paused]);

  const handleManualToggle = useCallback((val: boolean) => {
    setShowAfter(val);
    setPaused(true);
    clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = setTimeout(() => setPaused(false), 8000);
  }, []);

  const currentImg = showAfter ? afterImg : beforeImg;
  const fallbackImg = afterImg || beforeImg;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="group rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-border/80 transition-all duration-300"
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted/30">
        <AnimatePresence mode="wait">
          <motion.div
            key={showAfter ? "after" : "before"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0"
          >
            {currentImg || fallbackImg ? (
              <img
                src={currentImg || fallbackImg || ""}
                alt={showAfter ? "Après" : "Avant"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <Camera className="h-12 w-12 text-primary/30" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Before/After toggle */}
        {hasBeforeAfter && (
          <div className="absolute top-3 left-3 flex rounded-full overflow-hidden border border-border/30"
            style={{ background: "hsl(var(--card) / 0.85)", backdropFilter: "blur(12px)" }}
          >
            <button
              onClick={(e) => { e.preventDefault(); handleManualToggle(false); }}
              className={cn(
                "px-3 py-1 text-[10px] font-bold tracking-wide transition-all duration-200",
                !showAfter
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              AVANT
            </button>
            <button
              onClick={(e) => { e.preventDefault(); handleManualToggle(true); }}
              className={cn(
                "px-3 py-1 text-[10px] font-bold tracking-wide transition-all duration-200",
                showAfter
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              APRÈS
            </button>
          </div>
        )}

        {/* Room badge */}
        {roomLabel && (
          <span
            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-semibold border border-border/30"
            style={{ background: "hsl(var(--card) / 0.85)", backdropFilter: "blur(12px)", color: "hsl(var(--foreground))" }}
          >
            {roomLabel}
          </span>
        )}

        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />

        {/* Budget + vote count */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          {budgetText && (
            <span className="text-[11px] font-bold text-white/90 bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-0.5">
              {budgetText}
            </span>
          )}
          <div className="flex items-center gap-1 bg-card/80 backdrop-blur-sm rounded-full px-2 py-1">
            <ChevronUp className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-bold text-foreground">{voteCount}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {desc && (
          <p className="text-sm text-foreground/90 line-clamp-2 leading-relaxed">
            {desc}
          </p>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => { e.preventDefault(); onSave?.(); }}
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                hasSaved ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Heart className={cn("h-4 w-4", hasSaved && "fill-primary")} />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); onSave?.(); }}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Bookmark className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => { e.preventDefault(); onShare?.(); }}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.preventDefault(); onVote?.(); }}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95",
                hasVoted
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/50"
              )}
            >
              <ChevronUp className="h-3 w-3" />
              Voter
            </button>
            <Button
              size="sm"
              className="text-xs h-7 rounded-full gap-1 active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
              onClick={(e) => { e.preventDefault(); onMyVersion?.(); }}
            >
              <Camera className="h-3 w-3" /> Ma version
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

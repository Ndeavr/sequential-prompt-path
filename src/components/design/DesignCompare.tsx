/**
 * UNPRO Design — Compare Mode
 * Side-by-side version comparison with voting
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight, Snowflake, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DesignVersion } from "./data";

interface Props {
  versions: DesignVersion[];
  originalImage: string | null;
  onClose: () => void;
  onFreeze: (id: string) => void;
  onSelect: (id: string) => void;
}

export default function DesignCompare({ versions, originalImage, onClose, onFreeze, onSelect }: Props) {
  const versionsWithImages = versions.filter((v) => v.imageUrl);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    versionsWithImages.slice(0, 2).map((v) => v.id)
  );
  const [votes, setVotes] = useState<Record<string, "love" | "like" | "nope">>({});

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const vote = (id: string, type: "love" | "like" | "nope") => {
    setVotes((prev) => ({ ...prev, [id]: prev[id] === type ? undefined! : type }));
  };

  const comparedVersions = versionsWithImages.filter((v) => selectedIds.includes(v.id));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-display font-semibold text-foreground">
            Comparer les versions
          </h2>
          <Badge variant="secondary" className="text-xs">
            {selectedIds.length} sélectionnée{selectedIds.length > 1 ? "s" : ""}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="w-4 h-4" />
        </Button>
      </header>

      {/* Version selector strip */}
      <div className="flex gap-2 px-4 py-3 border-b border-border overflow-x-auto">
        {originalImage && (
          <button
            className="shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 border-border opacity-60"
            title="Original"
          >
            <img src={originalImage} alt="Original" className="w-full h-full object-cover" />
          </button>
        )}
        {versionsWithImages.map((v) => (
          <button
            key={v.id}
            onClick={() => toggleSelect(v.id)}
            className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
              selectedIds.includes(v.id)
                ? "border-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <img src={v.imageUrl!} alt={`V${v.versionNumber}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {/* Comparison grid */}
      <div className="flex-1 flex gap-3 p-4 overflow-hidden">
        {comparedVersions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Sélectionnez des versions à comparer</p>
          </div>
        ) : (
          comparedVersions.map((v) => (
            <motion.div
              key={v.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 min-w-0 flex flex-col rounded-2xl border border-border bg-card overflow-hidden"
            >
              {/* Image */}
              <div className="relative flex-1 min-h-0">
                <img
                  src={v.imageUrl!}
                  alt={`V${v.versionNumber}`}
                  className="w-full h-full object-cover"
                />
                {/* Badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <Badge variant="secondary" className="text-xs font-mono bg-background/80 backdrop-blur-sm">
                    V{v.versionNumber}
                  </Badge>
                  {v.frozen && (
                    <Badge className="gap-1 bg-accent/20 text-accent text-xs backdrop-blur-sm">
                      <Snowflake className="w-3 h-3" />
                    </Badge>
                  )}
                </div>
                {/* Vote indicator */}
                {votes[v.id] && (
                  <div className="absolute top-3 right-3">
                    <Badge
                      className={`text-xs ${
                        votes[v.id] === "love"
                          ? "bg-red-500/20 text-red-400"
                          : votes[v.id] === "like"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {votes[v.id] === "love" ? "❤️" : votes[v.id] === "like" ? "👍" : "👎"}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Info + Actions */}
              <div className="p-3 space-y-2">
                <p className="text-xs text-muted-foreground truncate">
                  {v.styleLabel && <span className="text-foreground font-medium">{v.styleLabel}</span>}
                  {v.styleLabel && " • "}
                  {v.promptUsed}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => vote(v.id, "love")}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      votes[v.id] === "love"
                        ? "bg-red-500/15 text-red-400"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5" />
                    J'adore
                  </button>
                  <button
                    onClick={() => vote(v.id, "like")}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      votes[v.id] === "like"
                        ? "bg-green-500/15 text-green-400"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    Bien
                  </button>
                  <button
                    onClick={() => vote(v.id, "nope")}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      votes[v.id] === "nope"
                        ? "bg-muted text-muted-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    Non
                  </button>
                </div>
                <div className="flex gap-1.5">
                  {!v.frozen && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-8 gap-1"
                      onClick={() => onFreeze(v.id)}
                    >
                      <Snowflake className="w-3 h-3" />
                      Geler
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="flex-1 text-xs h-8 gap-1"
                    onClick={() => {
                      onSelect(v.id);
                      onClose();
                    }}
                  >
                    <Trophy className="w-3 h-3" />
                    Choisir
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

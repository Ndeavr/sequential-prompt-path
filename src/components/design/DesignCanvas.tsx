/**
 * UNPRO Design — Center Canvas
 * Active rendered version with before/after slider + error state
 */
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Snowflake, Copy, Share2, RotateCcw, ZoomIn, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DesignVersion } from "./data";

interface Props {
  originalImage: string | null;
  activeVersion: DesignVersion | null;
  isGenerating: boolean;
  error?: string | null;
  onFreeze: () => void;
  onDuplicate: () => void;
  onShare: () => void;
}

export default function DesignCanvas({
  originalImage,
  activeVersion,
  isGenerating,
  error,
  onFreeze,
  onDuplicate,
  onShare,
}: Props) {
  const [sliderPos, setSliderPos] = useState(50);
  const [showSlider, setShowSlider] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateSlider = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pos = ((clientX - rect.left) / rect.width) * 100;
      setSliderPos(Math.max(2, Math.min(98, pos)));
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!showSlider) return;
      setIsDragging(true);
      updateSlider(e.clientX);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    [showSlider, updateSlider]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isDragging) updateSlider(e.clientX);
    },
    [isDragging, updateSlider]
  );

  const handlePointerUp = useCallback(() => setIsDragging(false), []);

  const renderImage = activeVersion?.imageUrl || originalImage;
  const canCompareSlider = showSlider && originalImage && activeVersion?.imageUrl;

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {activeVersion && (
            <Badge variant="outline" className="font-mono text-xs">
              V{activeVersion.versionNumber}
            </Badge>
          )}
          {activeVersion?.frozen && (
            <Badge className="gap-1 bg-accent/10 text-accent border-accent/20 text-xs">
              <Snowflake className="w-3 h-3" />
              Gelée
            </Badge>
          )}
          {activeVersion?.styleLabel && (
            <span className="text-xs text-muted-foreground">{activeVersion.styleLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant={showSlider ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowSlider(!showSlider)}
            title="Avant / Après"
            disabled={!activeVersion?.imageUrl}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onFreeze} title="Geler">
            <Snowflake className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate} title="Dupliquer">
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onShare} title="Partager">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden bg-muted/20">
        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Snowflake className="w-6 h-6 text-primary animate-pulse" />
                </div>
              </div>
              <p className="mt-6 text-foreground font-medium">Génération en cours…</p>
              <p className="text-sm text-muted-foreground mt-1">L'IA transforme votre espace</p>
              <p className="text-xs text-muted-foreground/60 mt-3">Cela peut prendre 15 à 30 secondes</p>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center px-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-foreground font-medium text-center">{error}</p>
              <p className="text-sm text-muted-foreground mt-1 text-center">
                Modifiez vos instructions et réessayez
              </p>
            </motion.div>
          ) : renderImage ? (
            <motion.div
              key="image"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              ref={containerRef}
              className="absolute inset-0 flex items-center justify-center p-4 select-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            >
              {canCompareSlider ? (
                <div className="relative w-full h-full max-w-3xl rounded-2xl overflow-hidden">
                  <img src={activeVersion.imageUrl!} alt="Après" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
                    <img
                      src={originalImage!}
                      alt="Avant"
                      className="h-full object-cover"
                      style={{ width: containerRef.current?.clientWidth }}
                    />
                  </div>
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
                    style={{ left: `${sliderPos}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center cursor-col-resize">
                      <div className="flex gap-0.5">
                        <div className="w-0.5 h-3 bg-muted-foreground/50 rounded-full" />
                        <div className="w-0.5 h-3 bg-muted-foreground/50 rounded-full" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs font-medium">
                    Avant
                  </div>
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs font-medium">
                    Après
                  </div>
                </div>
              ) : (
                <img
                  src={renderImage}
                  alt="Version active"
                  className="max-w-full max-h-full rounded-2xl object-contain shadow-[var(--shadow-xl)]"
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <ZoomIn className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">Décrivez les modifications souhaitées</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Utilisez le panneau de droite pour commencer
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

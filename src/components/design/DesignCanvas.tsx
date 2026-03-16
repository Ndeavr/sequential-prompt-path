/**
 * UNPRO Design — Center Canvas
 * Active rendered version with before/after slider
 */
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Snowflake, Copy, Share2, Heart, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DesignVersion } from "./data";

interface Props {
  originalImage: string | null;
  activeVersion: DesignVersion | null;
  isGenerating: boolean;
  onFreeze: () => void;
  onDuplicate: () => void;
  onShare: () => void;
}

export default function DesignCanvas({
  originalImage,
  activeVersion,
  isGenerating,
  onFreeze,
  onDuplicate,
  onShare,
}: Props) {
  const [sliderPos, setSliderPos] = useState(50);
  const [showSlider, setShowSlider] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSliderMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const pos = ((clientX - rect.left) / rect.width) * 100;
      setSliderPos(Math.max(0, Math.min(100, pos)));
    },
    []
  );

  const renderImage = activeVersion?.imageUrl || originalImage;

  return (
    <div className="flex-1 flex flex-col min-h-0">
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
            <span className="text-xs text-muted-foreground">
              {activeVersion.styleLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowSlider(!showSlider)}
            title="Avant / Après"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onFreeze}
            title="Geler cette version"
          >
            <Snowflake className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onDuplicate}
            title="Dupliquer"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onShare}
            title="Partager"
          >
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
              <p className="mt-6 text-foreground font-medium">
                Génération en cours…
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                L'IA transforme votre espace
              </p>
            </motion.div>
          ) : renderImage ? (
            <motion.div
              key="image"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              ref={containerRef}
              className="absolute inset-0 flex items-center justify-center p-4"
              onMouseMove={showSlider ? handleSliderMove : undefined}
              onTouchMove={showSlider ? handleSliderMove : undefined}
            >
              {showSlider && originalImage && activeVersion?.imageUrl ? (
                /* Before/After Slider */
                <div className="relative w-full h-full max-w-3xl rounded-2xl overflow-hidden">
                  {/* After (full) */}
                  <img
                    src={activeVersion.imageUrl}
                    alt="Après"
                    className="w-full h-full object-cover"
                  />
                  {/* Before (clipped) */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${sliderPos}%` }}
                  >
                    <img
                      src={originalImage}
                      alt="Avant"
                      className="w-full h-full object-cover"
                      style={{
                        width: containerRef.current?.clientWidth,
                      }}
                    />
                  </div>
                  {/* Slider Line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-col-resize"
                    style={{ left: `${sliderPos}%` }}
                  >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                      <div className="flex gap-0.5">
                        <div className="w-0.5 h-3 bg-muted-foreground/50 rounded-full" />
                        <div className="w-0.5 h-3 bg-muted-foreground/50 rounded-full" />
                      </div>
                    </div>
                  </div>
                  {/* Labels */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs font-medium">
                    Avant
                  </div>
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs font-medium">
                    Après
                  </div>
                </div>
              ) : (
                /* Single Image */
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
                <p className="text-muted-foreground font-medium">
                  Décrivez les modifications souhaitées
                </p>
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

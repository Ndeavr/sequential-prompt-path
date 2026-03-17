/**
 * UNPRO — Swipeable QR Bundle
 * Mobile-first horizontal card swiper for multi-feature QR placements.
 */
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Palette, BarChart3, CalendarCheck, Zap, Bot, Shield } from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  Palette, BarChart3, CalendarCheck, Zap, Bot, Shield,
};

export interface BundleCard {
  id: string;
  feature: string;
  headline: string;
  description?: string;
  icon?: string;
  gradient?: string;
  ctaText: string;
  deepLinkCode?: string;
}

interface SwipeBundleProps {
  cards: BundleCard[];
  onCardAction: (card: BundleCard) => void;
}

export default function SwipeBundle({ cards, onCardAction }: SwipeBundleProps) {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSwipe = (direction: number) => {
    const next = current + direction;
    if (next >= 0 && next < cards.length) setCurrent(next);
  };

  if (!cards.length) return null;

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      {/* Cards */}
      <div
        ref={containerRef}
        className="relative h-[280px] overflow-hidden rounded-2xl"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.25 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) handleSwipe(1);
              if (info.offset.x > 50) handleSwipe(-1);
            }}
            className="absolute inset-0"
          >
            {(() => {
              const card = cards[current];
              const Icon = ICON_MAP[card.icon || "Zap"] || Zap;
              const gradient = card.gradient || "from-primary/20 to-primary/5";
              return (
                <Card className="h-full border-0 shadow-lg overflow-hidden">
                  <div className={`h-24 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                    <div className="h-14 w-14 rounded-2xl bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-md">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <CardContent className="p-5 space-y-3">
                    <h3 className="text-lg font-bold text-foreground">{card.headline}</h3>
                    {card.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                    )}
                    <Button onClick={() => onCardAction(card)} className="w-full gap-2 rounded-xl" size="lg">
                      {card.ctaText} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${
              i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

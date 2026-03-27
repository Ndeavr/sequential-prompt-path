/**
 * UnproOfferCarousel — Horizontal swipeable card carousel.
 * TripleTen-inspired with snap scroll + dots.
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import UnproPremiumCard, { type OfferCardData } from "./UnproPremiumCard";

interface Props {
  cards: OfferCardData[];
  onAlexClick?: () => void;
}

export default function UnproOfferCarousel({ cards, onAlexClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateIndex = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth + 12
      : 300;
    setActiveIndex(Math.round(scrollLeft / cardWidth));
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateIndex, { passive: true });
    return () => el.removeEventListener("scroll", updateIndex);
  }, [updateIndex]);

  const scroll = (dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth + 12
      : 300;
    el.scrollBy({ left: dir * cardWidth, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide px-5 md:px-8 pb-4"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {cards.map((card, i) => (
          <UnproPremiumCard
            key={card.id}
            card={card}
            index={i}
            onAlexClick={onAlexClick}
          />
        ))}
        {/* Spacer for last card */}
        <div className="shrink-0 w-4" />
      </div>

      {/* Desktop arrows */}
      <button
        onClick={() => scroll(-1)}
        className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/90 backdrop-blur border border-border/60 items-center justify-center shadow-md hover:bg-card transition-colors z-10"
        aria-label="Carte précédente"
      >
        <ChevronLeft className="h-5 w-5 text-foreground" />
      </button>
      <button
        onClick={() => scroll(1)}
        className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/90 backdrop-blur border border-border/60 items-center justify-center shadow-md hover:bg-card transition-colors z-10"
        aria-label="Carte suivante"
      >
        <ChevronRight className="h-5 w-5 text-foreground" />
      </button>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {cards.map((_, i) => (
          <button
            key={i}
            aria-label={`Carte ${i + 1}`}
            onClick={() => {
              const el = scrollRef.current;
              if (!el) return;
              const cardWidth = el.firstElementChild
                ? (el.firstElementChild as HTMLElement).offsetWidth + 12
                : 300;
              el.scrollTo({ left: i * cardWidth, behavior: "smooth" });
            }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === activeIndex
                ? "w-6 bg-primary"
                : "w-1.5 bg-muted-foreground/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

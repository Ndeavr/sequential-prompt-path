/**
 * StickyMobileCTAV2 — Single conversion CTA pinned to bottom on mobile.
 */
import { ArrowRight } from "lucide-react";

interface Props {
  onTrackCta: (key: string, section: string) => void;
}

export default function StickyMobileCTAV2({ onTrackCta }: Props) {
  const handleClick = () => {
    onTrackCta("sticky_book", "sticky");
    document.getElementById("section-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="bg-background/85 backdrop-blur-lg border-t border-border/60 px-4 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button
          onClick={handleClick}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_8px_24px_hsl(var(--primary)/0.4)] active:scale-[0.98] transition-transform"
        >
          Recevoir mes rendez-vous
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

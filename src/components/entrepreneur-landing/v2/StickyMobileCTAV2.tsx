/**
 * StickyMobileCTAV2 — Single conversion CTA pinned above the mobile bottom nav.
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
    <div
      className="fixed left-0 right-0 z-30 lg:hidden pointer-events-none"
      style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
    >
      <div className="px-4 pointer-events-auto">
        <button
          onClick={handleClick}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-[0_8px_24px_hsl(var(--primary)/0.35)] active:scale-[0.98] transition-transform"
        >
          Recevoir mes rendez-vous
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

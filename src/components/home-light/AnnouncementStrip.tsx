/**
 * AnnouncementStrip — dark navy strip above the hero.
 * Promotes the free contractor AI recommendation audit. Small yellow accent.
 */
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

export default function AnnouncementStrip() {
  return (
    <div
      className="relative z-20 w-full"
      style={{ background: "hsl(var(--navy-strip))" }}
    >
      <Link
        to="/entrepreneurs/audit-ia"
        className="mx-auto flex w-full max-w-5xl items-center justify-center gap-2 px-4 py-2.5 text-center text-[12.5px] font-medium text-white/90 transition-colors hover:text-white"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(var(--sun))" }} aria-hidden />
        <span>
          Entrepreneur? Découvrez si l'IA peut recommander votre entreprise —{" "}
          <span className="font-semibold text-white">audit gratuit</span>
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </Link>
    </div>
  );
}

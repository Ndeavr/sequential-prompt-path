import { Link } from "react-router-dom";
import UnproLogo from "@/components/brand/UnproLogo";

const signals = ["MAISON", "PROJET", "PRO", "MATCH", "CONFIANCE"];

export default function ImmersiveFooterGrid() {
  return (
    <footer className="alex-immersive relative isolate overflow-hidden border-t border-border/70 bg-background" aria-label="Pied de page UNPRO">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,hsl(var(--border)/0.45)_1px,transparent_1px)] [background-size:20%_100%]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-[linear-gradient(180deg,transparent,hsl(var(--primary)/0.09))]" />
      <div className="relative mx-auto max-w-7xl px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-20 md:px-8 md:pb-20 md:pt-28">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-tint">Grille d’intelligence résidentielle</p>
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border/70 bg-border/70 md:grid-cols-5">
          {signals.map((signal) => (
            <div key={signal} className="min-h-24 bg-background/90 p-4 text-xs font-semibold tracking-[0.16em] text-readable-soft md:min-h-36">
              {signal}
            </div>
          ))}
        </div>
        <UnproLogo size={260} tone="dark" className="mt-16 h-auto w-full max-w-3xl" />
        <div className="mt-10 flex flex-col gap-5 border-t border-border/70 pt-6 text-sm text-readable-soft sm:flex-row sm:items-center sm:justify-between">
          <span>UNPRO © 2026 · Québec, Canada</span>
          <nav className="flex flex-wrap gap-x-5 gap-y-3" aria-label="Liens légaux">
            <Link className="transition-colors hover:text-foreground" to="/confidentialite">Confidentialité</Link>
            <Link className="transition-colors hover:text-foreground" to="/conditions">Conditions</Link>
            <Link className="transition-colors hover:text-foreground" to="/contact">Contact</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
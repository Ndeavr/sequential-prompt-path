/**
 * SectionMemoireMaison — Premium emotional closing section for the homepage /
 * global public layout. Introduces the Passeport Maison as the memory of the
 * property. Sits above SiteFooterPremium.
 */
import { Link } from "react-router-dom";
import { ArrowRight, Mic } from "lucide-react";

const BODY_LINES = [
  "Elle conserve son historique.",
  "Elle retrouve ses documents.",
  "Elle anticipe les entretiens.",
  "Elle vous aide à éviter les mauvaises surprises.",
  "Bienvenue dans le Passeport Maison.",
];

export default function SectionMemoireMaison() {
  return (
    <section
      aria-label="Votre maison se souvient"
      className="relative overflow-hidden"
      style={{ backgroundColor: "#050816" }}
    >
      {/* Soft radial glow — cinematic dark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, hsl(220 90% 60% / 0.10) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-6 py-24 md:py-32 text-center">
        <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.03em] text-foreground leading-[1.05]">
          Votre maison se souvient.
        </h2>

        <div className="mt-8 md:mt-10 space-y-2">
          {BODY_LINES.map((line) => (
            <p
              key={line}
              className="text-lg md:text-xl text-foreground/85 leading-relaxed"
            >
              {line}
            </p>
          ))}
        </div>

        <p className="mt-10 md:mt-12 mx-auto max-w-xl text-sm md:text-base text-muted-foreground leading-relaxed">
          UNPRO aide les propriétaires québécois à conserver l'information
          importante de leur propriété afin de prendre des décisions plus
          éclairées, plus rapides et plus rentables.
        </p>

        <div className="mt-10 md:mt-12 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Link
            to="/dashboard/properties/new"
            className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-primary text-primary-foreground text-base font-semibold tracking-tight shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] hover:-translate-y-[2px] transition-transform duration-[420ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
          >
            Créer mon Passeport Maison
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/alex"
            className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl border border-foreground/15 text-foreground text-base font-medium bg-foreground/[0.03] hover:bg-foreground/[0.06] hover:-translate-y-[2px] transition-all duration-[420ms] [transition-timing-function:cubic-bezier(.22,1,.36,1)]"
          >
            <Mic className="w-4 h-4" />
            Parler à Alex
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * PillarStrip — Compact horizontal strip of the 6 UNPRO pillars.
 *
 * Drop this on any page that should reinforce the "UNPRO is more than
 * contractor matching" sitewide messaging rule.
 */
import { Link } from "react-router-dom";
import { UNPRO_IDENTITY } from "@/brand/unproIdentity";

interface Props {
  variant?: "dark" | "light";
  className?: string;
  heading?: string;
}

export default function PillarStrip({
  variant = "dark",
  className = "",
  heading = "UNPRO en 6 piliers",
}: Props) {
  const isDark = variant === "dark";
  return (
    <section
      aria-label="Les six piliers d'UNPRO"
      className={`w-full px-4 py-8 md:py-12 ${className}`}
      style={{
        color: isDark ? "rgba(255,255,255,0.92)" : "#0B1220",
      }}
    >
      <div className="max-w-5xl mx-auto">
        <div
          className="text-[11px] uppercase tracking-[0.22em] font-semibold mb-4 opacity-70"
        >
          {heading}
        </div>
        <ul className="flex flex-wrap gap-2 md:gap-2.5">
          {UNPRO_IDENTITY.pillars.map((p) => (
            <li key={p.id}>
              <Link
                to={p.path}
                className="inline-flex flex-col gap-0.5 px-3.5 py-2.5 rounded-2xl transition-all hover:-translate-y-[1px]"
                style={{
                  background: isDark ? "rgba(255,255,255,0.04)" : "rgba(11,18,32,0.04)",
                  border: isDark
                    ? "1px solid rgba(255,255,255,0.10)"
                    : "1px solid rgba(11,18,32,0.10)",
                  backdropFilter: isDark ? "blur(10px)" : undefined,
                }}
              >
                <span className="text-[13.5px] font-semibold leading-tight">
                  {p.titleFr}
                </span>
                <span
                  className="text-[11.5px] leading-tight"
                  style={{ opacity: 0.66 }}
                >
                  {p.tagFr}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p
          className="mt-4 text-[12.5px] leading-relaxed"
          style={{ opacity: 0.62 }}
        >
          Le jumelage d'entrepreneur est <strong>un</strong> pilier d'UNPRO, pas
          l'entreprise au complet. UNPRO est la couche d'intelligence pour
          votre propriété, guidée par Alex.
        </p>
      </div>
    </section>
  );
}

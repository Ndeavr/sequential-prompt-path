/**
 * RecommendedProsRail — AI-style contractor recommendation cards.
 * Lazy-loaded by PageHomeCinematic. Fetches top 3 by rating fallback.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, MapPin, Calendar, BadgeCheck, ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Pro = {
  id: string;
  slug: string;
  business_name: string;
  specialty: string | null;
  city: string | null;
  rating: number | null;
  review_count: number | null;
  aipp_score: number | null;
  admin_verified: boolean | null;
  logo_url: string | null;
  years_experience: number | null;
};

const REASONS = [
  "Excellente satisfaction client",
  "Disponibilité cette semaine",
  "Projets similaires au vôtre",
  "Proximité géographique",
];

export default function RecommendedProsRail() {
  const [pros, setPros] = useState<Pro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("contractors")
        .select(
          "id, slug, business_name, specialty, city, rating, review_count, aipp_score, admin_verified, logo_url, years_experience"
        )
        .eq("admin_verified", true)
        .not("slug", "is", null)
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(3);
      setPros((data as Pro[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-3xl h-72 animate-pulse"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          />
        ))}
      </div>
    );
  }

  if (pros.length === 0) {
    return (
      <div
        className="rounded-3xl p-8 text-center text-white/60 text-sm"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        Les recommandations apparaîtront ici dès que vous décrivez votre projet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {pros.map((p, idx) => (
        <Link
          key={p.id}
          to={`/entrepreneur/${p.slug}`}
          className="block rounded-3xl p-5 transition-all duration-[420ms] hover:-translate-y-0.5 group"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* "Pourquoi recommandé" badge */}
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase mb-4"
            style={{
              background: "rgba(56,189,248,0.12)",
              color: "hsl(189 94% 70%)",
              border: "1px solid rgba(56,189,248,0.25)",
            }}
          >
            <Sparkles size={10} /> #{idx + 1} recommandé
          </div>

          {/* Identity */}
          <div className="flex items-start gap-3">
            <div
              className="w-14 h-14 rounded-2xl shrink-0 grid place-items-center text-lg font-bold text-white"
              style={{
                background: "linear-gradient(135deg, hsl(217 91% 50%), hsl(189 94% 50%))",
              }}
            >
              {p.business_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-[15px] text-white truncate">
                  {p.business_name}
                </h3>
                {p.admin_verified && (
                  <BadgeCheck size={14} className="text-cyan-300 shrink-0" />
                )}
              </div>
              <p className="text-xs text-white/55 mt-0.5 truncate">{p.specialty}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-white/60">
                {p.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={11} /> {p.city}
                  </span>
                )}
                {p.rating && (
                  <span className="inline-flex items-center gap-1">
                    <Star size={11} className="fill-amber-300 text-amber-300" />
                    {p.rating.toFixed(1)}
                    {p.review_count ? ` (${p.review_count})` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Why recommended */}
          <div
            className="mt-4 rounded-2xl p-3 text-[12px] text-white/80 space-y-1.5"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <div className="font-semibold text-white/65 text-[10px] tracking-wider uppercase">
              Pourquoi recommandé
            </div>
            {REASONS.slice(0, 3).map((r) => (
              <div key={r} className="flex items-center gap-2">
                <span className="text-cyan-300">✓</span> {r}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[11px] text-white/50 inline-flex items-center gap-1">
              <Calendar size={11} /> Disponible cette semaine
            </span>
            <span
              className="rounded-xl px-3 py-1.5 text-[12px] font-semibold text-[#050816] inline-flex items-center gap-1 transition-transform group-hover:translate-x-0.5"
              style={{
                background: "linear-gradient(135deg, hsl(189 94% 65%), hsl(217 91% 65%))",
              }}
            >
              Voir <ArrowRight size={12} />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

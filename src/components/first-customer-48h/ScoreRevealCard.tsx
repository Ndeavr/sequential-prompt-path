/**
 * ScoreRevealCard — 5 dimensions IA + opportunités détectées + CTA activation.
 */
import { CheckCircle2 } from "lucide-react";

interface Scores {
  visibility: number;
  trust: number;
  authority: number;
  profile: number;
  growth: number;
}

interface Props {
  scores: Scores;
  opportunities: string[];
  onActivate: () => void;
}

const DIMENSIONS: { key: keyof Scores; label: string }[] = [
  { key: "visibility", label: "Visibilité IA" },
  { key: "trust", label: "Confiance numérique" },
  { key: "authority", label: "Autorité locale" },
  { key: "profile", label: "Profil entrepreneur" },
  { key: "growth", label: "Potentiel de croissance" },
];

function tone(v: number) {
  if (v >= 80) return "#10B981";
  if (v >= 65) return "#F5C85A";
  return "#F97316";
}

export default function ScoreRevealCard({ scores, opportunities, onActivate }: Props) {
  return (
    <div className="space-y-4">
      <div
        className="rounded-3xl p-5 md:p-6 border bg-white"
        style={{
          borderColor: "rgba(11,18,32,0.08)",
          boxShadow: "0 12px 28px -12px rgba(11,18,32,0.18)",
        }}
      >
        <h2
          className="text-[18px] md:text-[20px] font-extrabold mb-4"
          style={{ color: "#0B1220", letterSpacing: "-0.02em" }}
        >
          Analyse IA de votre entreprise
        </h2>
        <div className="space-y-3">
          {DIMENSIONS.map(({ key, label }) => {
            const v = scores[key];
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold" style={{ color: "#0B1220" }}>
                    {label}
                  </span>
                  <span className="text-[13px] font-bold" style={{ color: tone(v) }}>
                    {v}<span className="text-[10px] font-medium opacity-60">/100</span>
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "#E2E8F0" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${v}%`, background: tone(v) }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="rounded-3xl p-5 md:p-6 border bg-white"
        style={{ borderColor: "rgba(11,18,32,0.08)" }}
      >
        <h3 className="text-[15px] font-extrabold mb-3" style={{ color: "#0B1220" }}>
          Opportunités détectées
        </h3>
        <ul className="space-y-2">
          {opportunities.map((o) => (
            <li key={o} className="flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" style={{ color: "#10B981" }} />
              <span className="text-[13px]" style={{ color: "#334155" }}>
                {o}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={onActivate}
        className="w-full px-6 py-4 rounded-2xl font-bold text-[15px] transition-transform hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(135deg, #F5C85A 0%, #D4AF37 100%)",
          color: "#0B1220",
          boxShadow: "0 14px 28px -10px rgba(245,200,90,0.6)",
        }}
      >
        Activer mon profil UNPRO →
      </button>
    </div>
  );
}

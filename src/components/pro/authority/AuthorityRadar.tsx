/**
 * Authority DNA Radar V2 — 8 dimensions + real stat cards
 */
import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import type { AuthorityDimensions } from "@/services/authorityScoreV2";
import { DIMENSION_META } from "@/services/authorityScoreV2";

interface Props {
  dimensions: AuthorityDimensions;
  overall: number;
  tier: string;
  confidence: number;
  tags: string[];
}

function StatCard({ label, value, sub, index }: { label: string; value: string; sub: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 + index * 0.1, duration: 0.4 }}
      className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 hover:border-primary/30 transition-colors"
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold font-display text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>
    </motion.div>
  );
}

export default function AuthorityRadar({ dimensions, overall, tier, confidence, tags }: Props) {
  const radarData = (Object.keys(DIMENSION_META) as (keyof AuthorityDimensions)[]).map((key) => ({
    axis: DIMENSION_META[key].label.split(" ").slice(0, 2).join(" "),
    value: dimensions[key],
  }));

  const tierLabel = tier === "elite" ? "Élite" : tier === "authority" ? "Autorité" : tier === "gold" ? "Or" : tier === "silver" ? "Argent" : "Bronze";

  const statCards = [
    { label: "Niveau", value: tierLabel, sub: `Score global : ${overall}/100` },
    { label: "Confiance", value: `${Math.round(confidence * 100)}%`, sub: "Basé sur les signaux disponibles" },
    { label: "Dimensions fortes", value: `${Object.values(dimensions).filter(v => v >= 75).length}/8`, sub: "Dimensions ≥ 75" },
    { label: "Tags", value: tags.length > 0 ? tags[0] : "—", sub: tags.length > 1 ? `+${tags.length - 1} autres` : "Aucun tag encore" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
      >
        <h3 className="font-display text-sm font-semibold text-foreground mb-1">ADN de performance</h3>
        <p className="text-xs text-muted-foreground mb-4">8 dimensions réelles de votre profil</p>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="hsl(228 18% 16%)" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: "hsl(220 14% 50%)", fontSize: 10 }}
              />
              <Radar
                dataKey="value"
                stroke="hsl(222 100% 65%)"
                fill="hsl(222 100% 65%)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary border border-primary/20">
                {tag}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        {statCards.map((s, i) => (
          <StatCard key={s.label} {...s} index={i} />
        ))}
      </div>
    </div>
  );
}

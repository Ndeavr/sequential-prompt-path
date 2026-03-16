/**
 * Authority DNA — Radar chart + stat cards
 */
import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { radarData } from "./data";

const statCards = [
  { label: "Classement local", value: "#18", sub: "sur 92 · Montréal" },
  { label: "Recommandation Alex", value: "32 %", sub: "Probabilité actuelle" },
  { label: "Visibilité estimée", value: "Moyenne", sub: "Peut augmenter rapidement" },
  { label: "Potentiel débloquable", value: "+220 pts", sub: "Avec quelques actions ciblées" },
];

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

export default function AuthorityRadar() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Radar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
      >
        <h3 className="font-display text-sm font-semibold text-foreground mb-1">ADN d'autorité</h3>
        <p className="text-xs text-muted-foreground mb-4">Vue d'ensemble de votre profil professionnel</p>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
              <PolarGrid stroke="hsl(228 18% 16%)" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: "hsl(220 14% 50%)", fontSize: 11 }}
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

        <p className="text-xs text-muted-foreground leading-relaxed mt-3">
          Votre profil montre une bonne base d'expertise, mais certaines dimensions limitent encore votre plein potentiel de visibilité.
        </p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((s, i) => (
          <StatCard key={s.label} {...s} index={i} />
        ))}
      </div>
    </div>
  );
}

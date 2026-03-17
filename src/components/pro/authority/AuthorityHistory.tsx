/**
 * Score History V2 — line chart on /100 scale
 */
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useState } from "react";

const filters = ["30 jours", "90 jours", "12 mois"] as const;

// Demo data — will be replaced by DB events when available
const historyData = [
  { month: "Jan", score: 42 },
  { month: "Fév", score: 48 },
  { month: "Mar", score: 55 },
  { month: "Avr", score: 61 },
  { month: "Mai", score: 65 },
  { month: "Juin", score: 68 },
];

export default function AuthorityHistory() {
  const [active, setActive] = useState<string>("90 jours");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.5 }}
      className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Historique du score</h3>
          <p className="text-xs text-muted-foreground">Suivez l'évolution de votre Authority Score V2</p>
        </div>
        <div className="flex gap-1 p-0.5 rounded-lg bg-muted/30 border border-border/30">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActive(f)}
              className={`px-3 py-1 text-xs rounded-md transition-colors font-medium ${
                active === f
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={historyData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <defs>
              <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(222 100% 65%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(222 100% 65%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tick={{ fill: "hsl(220 14% 50%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(220 14% 50%)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(228 25% 7%)",
                border: "1px solid hsl(228 18% 16%)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(220 20% 93%)",
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="hsl(222 100% 65%)"
              fill="url(#histGradient)"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(222 100% 65%)", stroke: "hsl(228 25% 7%)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
        Score basé sur la performance réelle : complétion de projets, qualité des avis, précision du matching et réactivité.
      </p>
    </motion.div>
  );
}

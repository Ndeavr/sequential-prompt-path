/**
 * Score Projection V2 — step chart + suggestion cards on /100 scale
 */
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { suggestions, SCORE_TOTAL } from "./data";
import { ArrowRight } from "lucide-react";

interface Props {
  currentScore: number;
}

export default function AuthorityProjection({ currentScore }: Props) {
  const projectionSteps = suggestions.map(s => ({ label: s.title.slice(0, 20) + "…", points: s.points }));
  const potentialScore = Math.min(SCORE_TOTAL, currentScore + suggestions.reduce((s, x) => s + x.points, 0));

  const chartData = (() => {
    let cumulative = currentScore;
    const points = [{ label: "Actuel", score: cumulative }];
    projectionSteps.forEach((s) => {
      cumulative = Math.min(100, cumulative + s.points);
      points.push({ label: `+${s.points}`, score: cumulative });
    });
    return points;
  })();

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-1">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Projection du score</h3>
            <p className="text-xs text-muted-foreground">Actions concrètes pour progresser</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">Actuel <span className="text-foreground font-bold ml-1">{currentScore}</span></span>
            <span className="text-muted-foreground">Potentiel <span className="text-success font-bold ml-1">{potentialScore}</span></span>
          </div>
        </div>

        <div className="h-48 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <defs>
                <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(222 100% 65%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(222 100% 65%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(220 14% 50%)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(220 14% 50%)", fontSize: 10 }}
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
                type="stepAfter"
                dataKey="score"
                stroke="hsl(222 100% 65%)"
                fill="url(#projGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Suggestions */}
      <div>
        <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-primary" />
          Améliorez votre score
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestions.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + i * 0.1, duration: 0.4 }}
              className="group rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 hover:border-primary/40 hover:shadow-[0_0_20px_-4px_hsl(222_100%_65%/0.15)] transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary shrink-0 group-hover:bg-primary/15 transition-colors">
                  <s.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-foreground">{s.title}</p>
                    <span className="text-xs font-bold font-display text-success ml-2">+{s.points}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

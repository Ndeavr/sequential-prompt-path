import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface Props { userId?: string; }

const DEMO_DATA = [
  { week: "S1", authority: 22, content: 3, engagement: 120 },
  { week: "S2", authority: 28, content: 5, engagement: 210 },
  { week: "S3", authority: 31, content: 4, engagement: 180 },
  { week: "S4", authority: 35, content: 7, engagement: 340 },
  { week: "S5", authority: 38, content: 6, engagement: 290 },
  { week: "S6", authority: 42, content: 8, engagement: 420 },
  { week: "S7", authority: 45, content: 9, engagement: 510 },
  { week: "S8", authority: 52, content: 11, engagement: 680 },
];

export default function AuthorityPerformance({ userId }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7 }}
    >
      <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2 mb-4">
        <BarChart3 className="h-5 w-5 text-accent" />
        Performance
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Authority Growth */}
        <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Croissance d'autorité</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={DEMO_DATA}>
              <defs>
                <linearGradient id="authorityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(222, 100%, 61%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(222, 100%, 61%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="authority" stroke="hsl(222, 100%, 61%)" fill="url(#authorityGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement */}
        <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Engagement</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={DEMO_DATA}>
              <defs>
                <linearGradient id="engagementGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(252, 100%, 65%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(252, 100%, 65%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="engagement" stroke="hsl(252, 100%, 65%)" fill="url(#engagementGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.section>
  );
}

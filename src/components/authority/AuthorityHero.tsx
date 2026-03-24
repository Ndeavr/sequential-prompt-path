import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Globe, Zap, BarChart3 } from "lucide-react";

interface Props { userId?: string; }

export default function AuthorityHero({ userId }: Props) {
  const { data: perf } = useQuery({
    queryKey: ["authority-performance", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("authority_performance")
        .select("*")
        .eq("user_id", userId!)
        .order("snapshot_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const score = perf?.overall_score ?? 42;
  const growth = Number(perf?.growth_pct ?? 12.5);
  const content = perf?.content_volume ?? 8;
  const platforms = perf?.platform_diversity ?? 3;
  const signals = perf?.signal_strength ?? 15;
  const consistency = perf?.consistency_score ?? 65;

  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (score / 100) * circumference;

  const subMetrics = [
    { icon: BarChart3, label: "Contenu produit", value: content },
    { icon: Globe, label: "Plateformes", value: platforms },
    { icon: Zap, label: "Signaux", value: signals },
    { icon: TrendingUp, label: "Consistance", value: `${consistency}%` },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <div className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur-xl p-6 md:p-10 shadow-[var(--shadow-xl)]">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Score Orb */}
          <div className="relative flex-shrink-0">
            <motion.div
              className="absolute inset-0 rounded-full opacity-30"
              style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)" }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <svg width={160} height={160} className="-rotate-90">
              <circle cx={80} cy={80} r={70} fill="none" stroke="hsl(var(--muted))" strokeWidth={8} />
              <motion.circle
                cx={80} cy={80} r={70} fill="none"
                stroke="url(#authority-gradient)"
                strokeWidth={8}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="authority-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--secondary))" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="text-4xl font-bold text-foreground font-display"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                {score}
              </motion.span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Authority</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left space-y-3">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground font-display">
              Authority Status
            </h1>
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-success/10 text-success border border-success/20">
                <TrendingUp className="h-3 w-3" />
                +{growth}%
              </span>
              <span className="text-xs text-muted-foreground">Visibilité AI en hausse</span>
            </div>

            {/* Sub metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {subMetrics.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="rounded-xl border border-border/40 bg-muted/30 backdrop-blur-sm p-3 text-center"
                >
                  <m.icon className="h-4 w-4 mx-auto text-primary mb-1" />
                  <div className="text-lg font-bold text-foreground">{m.value}</div>
                  <div className="text-[10px] text-muted-foreground">{m.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

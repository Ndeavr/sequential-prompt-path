import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Radio, Link2, MessageCircle, Globe, Star } from "lucide-react";

interface Props { userId?: string; }

const SIGNAL_ICONS: Record<string, any> = {
  mention: Radio,
  backlink: Link2,
  forum_post: MessageCircle,
  media: Globe,
  review: Star,
};

const SIGNAL_COLORS: Record<string, string> = {
  mention: "text-primary bg-primary/10",
  backlink: "text-success bg-success/10",
  forum_post: "text-accent bg-accent/10",
  media: "text-secondary bg-secondary/10",
  review: "text-warning bg-warning/10",
};

export default function AuthoritySignalsFeed({ userId }: Props) {
  const { data: signals = [] } = useQuery({
    queryKey: ["authority-signals", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("authority_signals")
        .select("*")
        .eq("user_id", userId!)
        .order("detected_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const items = signals.length > 0 ? signals : [
    { id: "1", signal_type: "backlink", source: "renovationexperts.ca", strength_score: 82, detected_at: new Date().toISOString() },
    { id: "2", signal_type: "mention", source: "Reddit r/MontrealReno", strength_score: 65, detected_at: new Date().toISOString() },
    { id: "3", signal_type: "forum_post", source: "Quora — Rénovation QC", strength_score: 58, detected_at: new Date().toISOString() },
    { id: "4", signal_type: "review", source: "Google Business Profile", strength_score: 90, detected_at: new Date().toISOString() },
    { id: "5", signal_type: "media", source: "Le Devoir — Habitation", strength_score: 95, detected_at: new Date().toISOString() },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <h2 className="text-lg font-bold text-foreground font-display flex items-center gap-2 mb-4">
        <Radio className="h-5 w-5 text-secondary" />
        Signaux d'autorité
      </h2>

      <div className="space-y-2">
        {items.map((signal: any, i: number) => {
          const Icon = SIGNAL_ICONS[signal.signal_type] ?? Radio;
          const color = SIGNAL_COLORS[signal.signal_type] ?? SIGNAL_COLORS.mention;

          return (
            <motion.div
              key={signal.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.06 }}
              className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm p-3 hover:shadow-[var(--shadow-sm)] transition-all"
            >
              <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{signal.source}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{signal.signal_type.replace("_", " ")}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold text-foreground">{signal.strength_score}</div>
                <div className="text-[9px] text-muted-foreground">force</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

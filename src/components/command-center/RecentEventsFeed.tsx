/**
 * UNPRO — Recent Events Feed
 */
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CommandCenterEvent } from "@/services/dynamicPricingEngine";

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}j`;
}

export default function RecentEventsFeed({ events }: { events: CommandCenterEvent[] }) {
  return (
    <div className="rounded-xl border border-border/20 bg-card/20 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/10">
        <Activity className="w-4 h-4 text-green-400" />
        <span className="text-sm font-semibold">Événements</span>
      </div>
      <div className="max-h-[420px] overflow-y-auto divide-y divide-border/10">
        {events.length === 0 && (
          <div className="p-4 text-center text-xs text-muted-foreground">Aucun événement récent.</div>
        )}
        {events.slice(0, 20).map((e, i) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 px-4 py-2"
          >
            <span className="text-[10px] text-muted-foreground w-12 flex-shrink-0">{relativeTime(e.timestamp)}</span>
            <div className="flex-1 min-w-0">
              <span className="text-xs">
                <span className="font-medium">{e.businessName}</span>{" "}
                <span className="text-muted-foreground">{e.label}</span>
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

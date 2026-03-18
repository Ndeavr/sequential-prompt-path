/**
 * Notifications center
 */
import { motion } from "framer-motion";
import { Bell, CalendarCheck, Sparkles, TrendingUp, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MOCK_NOTIFS = [
  { icon: CalendarCheck, text: "Nouveau rendez-vous disponible dans votre zone", time: "Il y a 2h", type: "appointment" },
  { icon: Sparkles, text: "Conseil IA : ajoutez des photos pour +15% de visibilité", time: "Hier", type: "ai" },
  { icon: TrendingUp, text: "Votre score AIPP a augmenté de 3 points", time: "Il y a 3 jours", type: "score" },
  { icon: Star, text: "Un plan Premium pourrait tripler vos rendez-vous", time: "Cette semaine", type: "plan" },
];

export default function DashNotifications() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
      className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-accent" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Notifications</span>
        </div>
        <Badge variant="outline" className="text-[10px]">{MOCK_NOTIFS.length} nouvelles</Badge>
      </div>
      <div className="space-y-1">
        {MOCK_NOTIFS.map((n, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/10 transition-colors cursor-pointer">
            <div className="w-7 h-7 rounded-lg bg-muted/10 flex items-center justify-center flex-shrink-0">
              <n.icon className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-foreground truncate">{n.text}</p>
              <p className="text-[9px] text-muted-foreground">{n.time}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

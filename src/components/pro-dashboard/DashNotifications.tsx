/**
 * Notifications center — real data from notifications table
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Bell, CalendarCheck, Sparkles, TrendingUp, Star, MessageSquare, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useContractorNotifications } from "@/hooks/useContractorDashboardData";

const iconMap: Record<string, typeof Bell> = {
  appointment_created: CalendarCheck,
  contractor_on_the_way: TrendingUp,
  feedback_requested: MessageSquare,
  score_update: Star,
  ai_recommendation: Sparkles,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Il y a ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

export default function DashNotifications() {
  const { data: notifications, isLoading } = useContractorNotifications();

  const items = (notifications ?? []) as any[];
  const unreadCount = items.filter((n: any) => n.status === "unread" || !n.read_at).length;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
      className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-accent" />
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">Notifications</span>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="outline" className="text-[10px]">{unreadCount} nouvelles</Badge>
          )}
          <Link to="/pro/notifications" className="text-[10px] text-primary font-semibold hover:underline flex items-center gap-0.5">
            Voir tout <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="py-4 text-center">
          <p className="text-[11px] text-muted-foreground">Chargement...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-4 text-center">
          <Bell className="w-6 h-6 text-muted-foreground/20 mx-auto mb-1.5" />
          <p className="text-[11px] text-muted-foreground">Aucune notification pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.slice(0, 5).map((n: any) => {
            const Icon = iconMap[n.type] || Bell;
            const isUnread = n.status === "unread" || !n.read_at;
            return (
              <div key={n.id} className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors cursor-pointer ${isUnread ? "bg-primary/[0.04] hover:bg-primary/[0.08]" : "hover:bg-muted/10"}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isUnread ? "bg-primary/10" : "bg-muted/10"}`}>
                  <Icon className={`w-3.5 h-3.5 ${isUnread ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] truncate ${isUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {n.title || n.body || "Notification"}
                  </p>
                  <p className="text-[9px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                </div>
                {isUnread && <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

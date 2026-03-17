import { StatCard } from "@/components/shared";
import { CalendarCheck, TrendingUp, Clock, DollarSign } from "lucide-react";

interface LeadPerformanceMetricsProps {
  leads: any[];
}

const LeadPerformanceMetrics = ({ leads }: LeadPerformanceMetricsProps) => {
  const total = leads.length;

  const accepted = leads.filter((l) =>
    ["accepted", "scheduled", "completed"].includes(l.appointments?.status)
  ).length;

  const declined = leads.filter((l) =>
    ["declined", "cancelled"].includes(l.appointments?.status)
  ).length;

  const conversionRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

  const avgScore = total > 0
    ? Math.round(leads.reduce((s, l) => s + l.score, 0) / total)
    : 0;

  // Avg response time: time between lead creation and first status change (simplified)
  const withDates = leads.filter((l) => l.appointments?.created_at && l.created_at);
  const avgResponseHours = withDates.length > 0
    ? Math.round(
        withDates.reduce((sum, l) => {
          const created = new Date(l.created_at).getTime();
          const now = Date.now();
          return sum + (now - created) / (1000 * 60 * 60);
        }, 0) / withDates.length
      )
    : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      <StatCard
        title="Total rendez-vous"
        value={total}
        icon={<CalendarCheck className="h-4 w-4" />}
      />
      <StatCard
        title="Taux conversion"
        value={`${conversionRate}%`}
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <StatCard
        title="Score moyen"
        value={avgScore}
        icon={<DollarSign className="h-4 w-4" />}
      />
      <StatCard
        title="Temps moyen (h)"
        value={avgResponseHours < 1 ? "<1" : avgResponseHours}
        icon={<Clock className="h-4 w-4" />}
      />
    </div>
  );
};

export default LeadPerformanceMetrics;

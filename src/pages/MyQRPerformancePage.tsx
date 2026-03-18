/**
 * UNPRO — My QR Performance Page
 * Shows user's QR sharing stats: scans, signups, bookings, rewards.
 */
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { getUserQrStats } from "@/services/qrSharing";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState } from "@/components/shared";
import { QrCode, Eye, MousePointerClick, CalendarCheck, Award, TrendingUp } from "lucide-react";
import { QR_INTENTS } from "@/config/qrIntents";

const REWARD_TIERS = [
  { count: 1, label: "Starter", icon: "🎯", description: "Première invitation réussie" },
  { count: 3, label: "Café offert", icon: "☕", description: "3 inscriptions via ton lien" },
  { count: 5, label: "Ambassadeur", icon: "🏅", description: "Badge ambassadeur activé" },
  { count: 10, label: "Visibilité premium", icon: "🚀", description: "Boost de visibilité permanent" },
];

const MyQRPerformancePage = () => {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["my-qr-performance", user?.id],
    queryFn: () => getUserQrStats(user!.id),
    enabled: !!user?.id,
  });

  if (isLoading) return <DashboardLayout><LoadingState /></DashboardLayout>;

  const topIntentConfig = stats?.topIntent
    ? QR_INTENTS.find((i) => i.slug === stats.topIntent)
    : null;

  const currentRewardLevel = REWARD_TIERS.filter((t) => (stats?.totalSignups ?? 0) >= t.count);
  const nextReward = REWARD_TIERS.find((t) => (stats?.totalSignups ?? 0) < t.count);

  return (
    <DashboardLayout>
      <PageHeader
        title="Ma performance QR"
        description="Statistiques de partage et récompenses"
      />

      <div className="space-y-6 pb-8">
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<QrCode className="h-5 w-5 text-primary" />} value={stats?.totalScans ?? 0} label="Scans totaux" />
          <StatCard icon={<MousePointerClick className="h-5 w-5 text-success" />} value={stats?.totalSignups ?? 0} label="Inscriptions" />
          <StatCard icon={<CalendarCheck className="h-5 w-5 text-secondary" />} value={stats?.totalBookings ?? 0} label="Rendez-vous" />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-amber-500" />}
            value={topIntentConfig?.labelFr || "—"}
            label="Intent populaire"
            isText
          />
        </div>

        {/* Rewards */}
        <div className="rounded-2xl border border-border/20 bg-card p-5">
          <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Récompenses
          </h3>
          <div className="space-y-3">
            {REWARD_TIERS.map((tier) => {
              const unlocked = (stats?.totalSignups ?? 0) >= tier.count;
              return (
                <div
                  key={tier.count}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    unlocked ? "bg-success/5 border-success/20" : "bg-muted/10 border-border/10 opacity-50"
                  }`}
                >
                  <span className="text-2xl">{tier.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{tier.label}</p>
                    <p className="text-xs text-muted-foreground">{tier.description}</p>
                  </div>
                  {unlocked && <span className="text-xs font-bold text-success">✓ Débloqué</span>}
                </div>
              );
            })}
          </div>

          {nextReward && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Encore {nextReward.count - (stats?.totalSignups ?? 0)} inscription(s) pour débloquer « {nextReward.label} »
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MyQRPerformancePage;

function StatCard({ icon, value, label, isText }: { icon: React.ReactNode; value: number | string; label: string; isText?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 flex flex-col items-center gap-2">
      {icon}
      <span className={`${isText ? "text-sm" : "text-2xl"} font-bold text-foreground`}>{value}</span>
      <span className="text-[11px] text-muted-foreground text-center">{label}</span>
    </div>
  );
}

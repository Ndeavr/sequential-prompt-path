/**
 * UNPRO — Referral Stats Card
 * Displays role-appropriate referral metrics.
 */
import type { ShareRole } from "@/hooks/useReferralProfile";
import type { ReferralStats } from "@/hooks/useReferralProfile";

interface ReferralStatsCardProps {
  role: ShareRole;
  stats: ReferralStats | undefined;
}

const LABELS: Record<ShareRole, { col1: string; col2: string; col3: string }> = {
  homeowner: { col1: "Invitations", col2: "Visites", col3: "Inscriptions" },
  contractor: { col1: "Vues profil", col2: "Clics", col3: "Demandes" },
  affiliate: { col1: "Visites", col2: "Inscriptions", col3: "Conversions" },
  admin: { col1: "Visites", col2: "Inscriptions", col3: "Conversions" },
};

const ReferralStatsCard = ({ role, stats }: ReferralStatsCardProps) => {
  const labels = LABELS[role] || LABELS.homeowner;
  const s = stats || { totalViews: 0, totalSignups: 0, totalClicks: 0 };

  if (s.totalViews === 0 && s.totalSignups === 0 && s.totalClicks === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">Aucune activité pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatBlock label={labels.col1} value={s.totalClicks} />
      <StatBlock label={labels.col2} value={s.totalViews} />
      <StatBlock label={labels.col3} value={s.totalSignups} />
    </div>
  );
};

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-3 rounded-xl bg-muted/30 border border-border/10">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-caption text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

export default ReferralStatsCard;

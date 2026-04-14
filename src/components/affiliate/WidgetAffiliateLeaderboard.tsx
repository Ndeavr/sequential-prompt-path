/**
 * UNPRO — Affiliate Leaderboard Widget
 */
import { Trophy, Medal } from "lucide-react";

interface AffiliateRank {
  name: string;
  conversions: number;
  revenueCents: number;
}

interface Props {
  rankings: AffiliateRank[];
}

const WidgetAffiliateLeaderboard = ({ rankings }: Props) => {
  if (!rankings.length) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        Aucun affilié actif pour le moment.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">Leaderboard Affiliés</h3>
      </div>
      {rankings.slice(0, 10).map((r, i) => (
        <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/20 border border-border/10">
          <span className={`text-sm font-bold w-6 text-center ${i < 3 ? "text-amber-500" : "text-muted-foreground"}`}>
            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">{r.conversions}</p>
            <p className="text-xs text-muted-foreground">{(r.revenueCents / 100).toFixed(0)}$</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WidgetAffiliateLeaderboard;

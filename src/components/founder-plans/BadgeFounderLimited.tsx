
import { Crown } from "lucide-react";

export default function BadgeFounderLimited({ remaining }: { remaining?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/10 border border-warning/20 text-warning text-xs font-semibold">
      <Crown className="h-3 w-3" />
      {remaining !== undefined && remaining <= 10
        ? `⚡ Seulement ${remaining} places`
        : "Places limitées"}
    </span>
  );
}

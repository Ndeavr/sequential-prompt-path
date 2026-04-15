/**
 * BadgeContextUsed — "Based on your history" indicator badge.
 */
import { History } from "lucide-react";

export default function BadgeContextUsed() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
      <History className="w-3 h-3" />
      Basé sur votre historique
    </span>
  );
}

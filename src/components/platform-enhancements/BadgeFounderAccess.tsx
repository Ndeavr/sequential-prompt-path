/**
 * BadgeFounderAccess — Founder badge with priority territory access.
 */
import { Crown } from "lucide-react";

interface Props {
  isFounder?: boolean;
  territory?: string;
}

export default function BadgeFounderAccess({ isFounder = true, territory = "Laval" }: Props) {
  if (!isFounder) return null;

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full
      bg-gradient-to-r from-yellow-500/10 to-amber-500/10
      border border-yellow-500/30 text-yellow-400">
      <Crown className="w-4 h-4" />
      <div className="text-xs">
        <span className="font-semibold">Fondateur</span>
        <span className="text-yellow-400/70 ml-1">· Accès prioritaire {territory}</span>
      </div>
    </div>
  );
}

/**
 * AITrustBadge — Glassmorphism premium badges for entrepreneur trust signals.
 * Pulls labels from the centralized entrepreneurMessaging.trust dictionary.
 */
import { cn } from "@/lib/utils";
import { entrepreneurMessaging } from "@/lib/copy/entrepreneurs";
import {
  Sparkles,
  Eye,
  MapPin,
  ShieldCheck,
  Zap,
  Heart,
  CalendarCheck,
  Star,
  Crown,
  Gauge,
  type LucideIcon,
} from "lucide-react";

export type AITrustBadgeKey =
  | "aiRecommended"
  | "highVisibility"
  | "optimizedTerritory"
  | "verifiedProfile"
  | "fastResponse"
  | "highCompatibility"
  | "availableThisWeek"
  | "localPriority"
  | "eliteUnpro"
  | "aippOptimized";

const ICON_MAP: Record<AITrustBadgeKey, LucideIcon> = {
  aiRecommended: Sparkles,
  highVisibility: Eye,
  optimizedTerritory: MapPin,
  verifiedProfile: ShieldCheck,
  fastResponse: Zap,
  highCompatibility: Heart,
  availableThisWeek: CalendarCheck,
  localPriority: Star,
  eliteUnpro: Crown,
  aippOptimized: Gauge,
};

interface Props {
  kind: AITrustBadgeKey;
  className?: string;
}

export default function AITrustBadge({ kind, className }: Props) {
  const Icon = ICON_MAP[kind];
  const label = entrepreneurMessaging.trust[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "bg-white/[0.04] backdrop-blur-xl border border-white/10",
        "text-[11px] font-medium text-foreground/90",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
        className
      )}
    >
      <Icon className="w-3 h-3 text-primary" />
      {label}
    </span>
  );
}

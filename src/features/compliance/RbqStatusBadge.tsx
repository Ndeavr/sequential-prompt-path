import { ShieldCheck, Clock, ShieldOff, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getRbqCompliance, type RbqStatus } from "@/lib/compliance/rbqStatus";

const ICONS: Record<RbqStatus, typeof ShieldCheck> = {
  verified: ShieldCheck,
  in_progress: Clock,
  not_provided: ShieldOff,
  expired: ShieldAlert,
};

interface Props {
  status?: RbqStatus | null;
  expiryDate?: string | null;
  lang?: "fr" | "en";
  size?: "sm" | "md";
  className?: string;
  showTooltip?: boolean;
}

/**
 * UNPRO — RBQ status pill. Renders the compliance badge across public
 * profile, contractor dashboard, admin views, and recommendation cards.
 */
export function RbqStatusBadge({
  status,
  expiryDate,
  lang = "fr",
  size = "md",
  className,
  showTooltip = true,
}: Props) {
  const compliance = getRbqCompliance({
    rbq_compliance_status: status ?? "not_provided",
    rbq_expiry_date: expiryDate,
  });
  const Icon = ICONS[compliance.status];
  const label = lang === "fr" ? compliance.badge.labelFr : compliance.badge.labelEn;
  const tooltip =
    lang === "fr" ? compliance.badge.explanationFr : compliance.badge.explanationEn;

  const pill = (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        compliance.badge.className,
        className,
      )}
      aria-label={label}
      role="status"
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} aria-hidden />
      {label}
    </span>
  );

  if (!showTooltip) return pill;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{pill}</TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs leading-relaxed">
          <p>{tooltip}</p>
          <p className="mt-1 opacity-70">
            {lang === "fr" ? compliance.badge.explanationEn : compliance.badge.explanationFr}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default RbqStatusBadge;

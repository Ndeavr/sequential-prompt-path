/**
 * UNPRO — "Validé par UnPRO" Badge System
 *
 * Reusable badge with 4 variants: compact, standard, detailed, tooltip.
 * ONLY renders when admin_verified === true.
 * Never implies legal or government certification.
 */
import { ShieldCheck, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { motion } from "framer-motion";

export interface UnproVerifiedBadgeProps {
  /** Must be strictly true — no badge otherwise */
  adminVerified: boolean;
  /** Optional internal score (admin view or detailed variant only) */
  internalVerifiedScore?: number | null;
  /** ISO date of last admin validation */
  internalVerifiedAt?: string | null;
  /** Badge variant */
  variant?: "compact" | "standard" | "detailed" | "tooltip";
  /** Extra className for wrapper */
  className?: string;
}

/* ── Legal disclaimer shown in tooltip/detailed ── */
const DISCLAIMER_FR =
  "Ce badge indique que cette entreprise possède un profil validé par l'équipe UnPRO. Il ne s'agit pas d'une certification légale gouvernementale.";

/* ── Date formatter ── */
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

/* ═════════════════════════════════════════════════ */

/**
 * Compact — minimal inline badge for search cards, lists.
 */
const CompactBadge = ({ className = "" }: { className?: string }) => (
  <Badge
    variant="outline"
    className={`gap-1 text-[10px] bg-success/8 text-success border-success/20 rounded-full px-2 py-0.5 font-semibold select-none ${className}`}
  >
    <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
    Validé
  </Badge>
);

/**
 * Standard — for profile headers, card headers.
 */
const StandardBadge = ({ className = "" }: { className?: string }) => (
  <Badge
    variant="outline"
    className={`gap-1.5 text-[11px] bg-success/5 text-success border-success/20 rounded-full px-3 py-1 font-semibold select-none ${className}`}
  >
    <ShieldCheck className="h-3 w-3" aria-hidden />
    Validé par UnPRO
  </Badge>
);

/**
 * Detailed — full panel for profile pages.
 */
const DetailedBadge = ({
  internalVerifiedScore,
  internalVerifiedAt,
  className = "",
}: Pick<UnproVerifiedBadgeProps, "internalVerifiedScore" | "internalVerifiedAt"> & { className?: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.35 }}
    className={`flex items-center gap-3 p-4 rounded-xl bg-success/5 border border-success/15 ${className}`}
    role="status"
    aria-label="Profil validé par UnPRO"
  >
    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success/10 shrink-0">
      <ShieldCheck className="w-5 h-5 text-success" aria-hidden />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-foreground">Validé par UnPRO</p>
      <p className="text-xs text-muted-foreground">
        Profil vérifié par notre équipe.
        {internalVerifiedScore != null && ` Score interne : ${internalVerifiedScore}/100.`}
      </p>
      {internalVerifiedAt && (
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
          Dernière validation : {fmtDate(internalVerifiedAt)}
        </p>
      )}
    </div>
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="shrink-0 p-1.5 rounded-full hover:bg-success/10 transition-colors"
          aria-label="En savoir plus sur la validation UnPRO"
        >
          <Info className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-72 text-xs text-muted-foreground">
        {DISCLAIMER_FR}
      </PopoverContent>
    </Popover>
  </motion.div>
);

/**
 * Tooltip — compact badge with info popover on hover/click.
 */
const TooltipBadge = ({ className = "" }: { className?: string }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        className={`inline-flex items-center gap-1 text-[10px] font-semibold text-success bg-success/8 border border-success/20 rounded-full px-2 py-0.5 hover:bg-success/12 transition-colors cursor-pointer select-none ${className}`}
        aria-label="Validé par UnPRO — cliquez pour en savoir plus"
      >
        <ShieldCheck className="h-2.5 w-2.5" aria-hidden />
        Validé
      </button>
    </PopoverTrigger>
    <PopoverContent side="top" className="w-64 text-xs">
      <p className="font-semibold text-foreground mb-1">Validé par UnPRO</p>
      <p className="text-muted-foreground">{DISCLAIMER_FR}</p>
    </PopoverContent>
  </Popover>
);

/* ═════════════════════════════════════════════════ */

/**
 * Main component — dispatches to the right variant.
 * Returns null if admin_verified is not true.
 */
export const UnproVerifiedBadge = ({
  adminVerified,
  internalVerifiedScore,
  internalVerifiedAt,
  variant = "standard",
  className,
}: UnproVerifiedBadgeProps) => {
  // Strict gate — no badge unless explicitly verified by admin
  if (adminVerified !== true) return null;

  switch (variant) {
    case "compact":
      return <CompactBadge className={className} />;
    case "detailed":
      return (
        <DetailedBadge
          internalVerifiedScore={internalVerifiedScore}
          internalVerifiedAt={internalVerifiedAt}
          className={className}
        />
      );
    case "tooltip":
      return <TooltipBadge className={className} />;
    case "standard":
    default:
      return <StandardBadge className={className} />;
  }
};

export default UnproVerifiedBadge;

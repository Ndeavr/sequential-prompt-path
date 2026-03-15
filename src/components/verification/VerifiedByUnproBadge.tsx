/**
 * VerifiedByUnproBadge — Prominent badge when admin_verified = true.
 *
 * Shown first in results — primary trust source.
 * If divergence exists, the layout handles it separately.
 */
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  adminVerified: boolean;
  internalVerifiedScore?: number | null;
  internalVerifiedAt?: string | null;
  loading?: boolean;
}

export default function VerifiedByUnproBadge({
  adminVerified,
  internalVerifiedScore,
  internalVerifiedAt,
  loading,
}: Props) {
  if (loading) return <Skeleton className="h-16 w-full rounded-xl" />;
  if (!adminVerified) return null;

  const formattedDate = internalVerifiedAt
    ? new Date(internalVerifiedAt).toLocaleDateString("fr-CA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-3 p-4 rounded-xl bg-success/5 border border-success/20"
      role="status"
      aria-label="Profil vérifié par l'équipe UnPRO"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success/10 shrink-0">
        <ShieldCheck className="w-5 h-5 text-success" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Validé par l'équipe UnPRO</p>
        <p className="text-xs text-muted-foreground">
          Ce profil a été vérifié manuellement par notre équipe.
          {internalVerifiedScore != null && ` Score interne : ${internalVerifiedScore}/100.`}
        </p>
        {formattedDate && (
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            Dernière validation : {formattedDate}
          </p>
        )}
      </div>
    </motion.div>
  );
}

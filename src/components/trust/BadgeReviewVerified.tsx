/**
 * UNPRO — BadgeReviewVerified
 * Shows a "Vérifié" badge on verified reviews.
 */
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  status: "pending" | "verified" | "rejected";
  className?: string;
  size?: "sm" | "md";
}

export default function BadgeReviewVerified({ status, className, size = "sm" }: Props) {
  if (status !== "verified") return null;
  const isSmall = size === "sm";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-400 font-medium",
        isSmall ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <ShieldCheck className={isSmall ? "h-3 w-3" : "h-3.5 w-3.5"} />
      Vérifié
    </span>
  );
}

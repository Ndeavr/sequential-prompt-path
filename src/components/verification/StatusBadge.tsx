import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, Ban } from "lucide-react";

export type VerificationVerdict = "succes" | "attention" | "non_succes" | "se_tenir_loin";

export const VERDICT_STYLES: Record<VerificationVerdict, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  glow: string;
}> = {
  succes: {
    label: "Succès",
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/25",
    glow: "shadow-[0_0_12px_-2px_hsl(var(--success)/0.4)]",
  },
  attention: {
    label: "Attention",
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/25",
    glow: "shadow-[0_0_12px_-2px_hsl(var(--warning)/0.4)]",
  },
  non_succes: {
    label: "Non-succès",
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/25",
    glow: "shadow-[0_0_12px_-2px_hsl(var(--destructive)/0.4)]",
  },
  se_tenir_loin: {
    label: "Se tenir loin",
    icon: Ban,
    color: "text-destructive",
    bg: "bg-destructive/15",
    border: "border-destructive/30",
    glow: "shadow-[0_0_16px_-2px_hsl(var(--destructive)/0.5)]",
  },
};

interface StatusBadgeProps {
  verdict: VerificationVerdict;
  size?: "sm" | "md";
}

export function StatusBadge({ verdict, size = "sm" }: StatusBadgeProps) {
  const cfg = VERDICT_STYLES[verdict];
  const Icon = cfg.icon;

  return (
    <motion.span
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border ${cfg.bg} ${cfg.border} ${cfg.color} ${cfg.glow} ${
        size === "sm" ? "text-[11px] px-2.5 py-0.5" : "text-xs px-3 py-1"
      }`}
    >
      <Icon className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {cfg.label}
    </motion.span>
  );
}

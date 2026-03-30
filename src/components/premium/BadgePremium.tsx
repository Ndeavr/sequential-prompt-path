/**
 * BadgePremium — Status and authority badges with UNPRO design tokens.
 */
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "destructive" | "info" | "authority" | "muted";

interface BadgePremiumProps {
  children: ReactNode;
  variant?: BadgeVariant;
  icon?: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-primary/8 text-primary border-primary/12",
  success: "bg-success/8 text-success border-success/12",
  warning: "bg-warning/10 text-warning border-warning/12",
  destructive: "bg-destructive/8 text-destructive border-destructive/12",
  info: "bg-info/8 text-info border-info/12",
  authority: "bg-primary/6 text-primary border-primary/15 shadow-glow",
  muted: "bg-muted text-muted-foreground border-border/60",
};

export function BadgePremium({ children, variant = "default", icon, className }: BadgePremiumProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-semibold border",
        variantStyles[variant],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}

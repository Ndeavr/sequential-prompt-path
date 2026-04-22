/**
 * StickyMobileCTA — Reusable sticky bottom CTA bar for mobile.
 * Single primary button + optional secondary ghost action.
 */
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  secondaryLabel?: string;
  secondaryOnClick?: () => void;
  secondaryIcon?: ReactNode;
  className?: string;
}

export default function StickyMobileCTA({
  label,
  onClick,
  icon,
  disabled,
  loading,
  secondaryLabel,
  secondaryOnClick,
  secondaryIcon,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        "bg-background/80 backdrop-blur-xl border-t border-border/50",
        "sm:hidden",
        className,
      )}
    >
      <Button
        size="lg"
        className="w-full h-13 text-base font-semibold rounded-xl"
        onClick={onClick}
        disabled={disabled || loading}
      >
        {icon}
        {label}
      </Button>
      {secondaryLabel && secondaryOnClick && (
        <Button
          variant="ghost"
          className="w-full mt-1.5 text-sm text-muted-foreground"
          onClick={secondaryOnClick}
        >
          {secondaryIcon}
          {secondaryLabel}
        </Button>
      )}
    </div>
  );
}

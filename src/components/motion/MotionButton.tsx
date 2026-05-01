/**
 * MotionButton — Premium tactile button with vault feel.
 *
 * - Glowing 1px primary border
 * - Mechanical press (scale 0.97, mechanicalSnap easing)
 * - Soft-click sound on press
 * - States: idle | loading | success | error  (mini scan bar during loading)
 * - Respects useReducedMotion
 */
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { useUnproSound } from "@/hooks/useUnproSound";
import { cn } from "@/lib/utils";

export type MotionButtonState = "idle" | "loading" | "success" | "error";

export interface MotionButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  state?: MotionButtonState;
  variant?: "primary" | "ghost" | "vault";
  size?: "sm" | "md" | "lg";
  glow?: boolean;
  iconLeft?: ReactNode;
  children?: ReactNode;
  /** Play vault-clack on confirmed action (success) instead of soft-click */
  confirmSound?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<MotionButtonProps["size"]>, string> = {
  sm: "h-9 px-4 text-sm rounded-xl",
  md: "h-11 px-5 text-sm rounded-2xl",
  lg: "h-14 px-7 text-base rounded-2xl",
};

const VARIANT_CLASSES: Record<NonNullable<MotionButtonProps["variant"]>, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/50",
  ghost:
    "bg-transparent text-foreground border border-border/60 hover:border-primary/60 hover:bg-primary/5",
  vault:
    "bg-gradient-to-b from-primary/95 to-primary text-primary-foreground hover:from-primary hover:to-primary/95",
};

const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  function MotionButton(
    {
      state = "idle",
      variant = "primary",
      size = "md",
      glow = true,
      iconLeft,
      children,
      className,
      disabled,
      confirmSound,
      onClick,
      ...rest
    },
    ref,
  ) {
    const reduce = useReducedMotion();
    const { softClick, vaultClack, errorSoft } = useUnproSound();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || state === "loading") return;
      if (confirmSound) vaultClack();
      else softClick();
      onClick?.(e);
    };

    // Side-effect sounds for state transitions handled by parent via useInteractionState.
    // We still surface error-soft if the consumer flips state to error directly.
    if (state === "error") errorSoft();

    return (
      <motion.button
        ref={ref}
        type="button"
        whileTap={reduce ? undefined : { scale: 0.97 }}
        transition={{ duration: 0.12, ease: [0.7, 0, 0.2, 1] }}
        onClick={handleClick}
        disabled={disabled || state === "loading"}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 font-semibold select-none",
          "transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          "disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden",
          SIZE_CLASSES[size],
          VARIANT_CLASSES[variant],
          glow &&
            "shadow-[0_0_0_1px_hsl(var(--primary)/0.35),_0_8px_28px_-12px_hsl(var(--primary)/0.55)]",
          state === "success" &&
            "ring-2 ring-success/60 shadow-[0_0_24px_-4px_hsl(var(--success)/0.6)]",
          state === "error" && "ring-2 ring-destructive/60",
          className,
        )}
        {...(rest as any)}
      >
        {/* Mini scan sweep during loading */}
        {state === "loading" && !reduce && (
          <motion.span
            aria-hidden
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"
            initial={{ x: "-120%" }}
            animate={{ x: "320%" }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
          />
        )}

        {state === "loading" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : state === "success" ? (
          <Check className="w-4 h-4" />
        ) : state === "error" ? (
          <AlertCircle className="w-4 h-4" />
        ) : (
          iconLeft
        )}
        <span className="relative z-10">{children}</span>
      </motion.button>
    );
  },
);

export default MotionButton;

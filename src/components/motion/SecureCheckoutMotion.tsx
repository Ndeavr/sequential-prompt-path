/**
 * SecureCheckoutMotion — Wraps a checkout block with the secure-vault sequence:
 *   scan → processing → vault open → activated
 * Lazy-loaded on checkout/payment surfaces.
 */
import { useEffect, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, Lock } from "lucide-react";
import { useUnproSound } from "@/hooks/useUnproSound";
import { cn } from "@/lib/utils";

export type CheckoutPhase = "idle" | "scanning" | "processing" | "opening" | "activated" | "error";

interface Props {
  phase: CheckoutPhase;
  children: ReactNode;
  className?: string;
}

export default function SecureCheckoutMotion({ phase, children, className }: Props) {
  const reduce = useReducedMotion();
  const { scanStart, vaultClack, paymentSuccess, errorSoft } = useUnproSound();

  useEffect(() => {
    if (phase === "scanning") scanStart();
    if (phase === "opening") vaultClack();
    if (phase === "activated") paymentSuccess();
    if (phase === "error") errorSoft();
  }, [phase, scanStart, vaultClack, paymentSuccess, errorSoft]);

  return (
    <div
      className={cn(
        "relative rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl p-5 overflow-hidden",
        phase === "activated" && "border-success/50 shadow-[0_0_36px_-8px_hsl(var(--success)/0.5)]",
        phase === "error" && "border-destructive/50",
        className,
      )}
      aria-busy={phase === "processing" || phase === "scanning"}
      aria-live="polite"
    >
      {/* Scanning sweep */}
      {(phase === "scanning" || phase === "processing") && !reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-primary/15 to-transparent"
          initial={{ y: 0 }}
          animate={{ y: ["0%", "100%", "0%"] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Vault open flash */}
      {phase === "opening" && !reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-primary/15"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        />
      )}

      <div className="relative flex items-center justify-between mb-4">
        <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          {phase === "activated" ? (
            <ShieldCheck className="w-4 h-4 text-success" />
          ) : (
            <Lock className="w-4 h-4 text-primary" />
          )}
          {phase === "activated" ? "Plan activé" : "Paiement sécurisé"}
        </span>
      </div>
      {children}
    </div>
  );
}

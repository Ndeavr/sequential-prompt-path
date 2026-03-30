/**
 * Premium UI states — Loading, Empty, Error, Success.
 */
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Loader (shimmer skeleton) ─── */
export function LoaderPulsePremium({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-3 py-12", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-lg bg-muted animate-shimmer"
          style={{
            width: `${80 - i * 15}%`,
            backgroundSize: "200% 100%",
            backgroundImage: `linear-gradient(90deg, hsl(var(--muted)) 0%, hsl(var(--muted-foreground) / 0.06) 50%, hsl(var(--muted)) 100%)`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Empty ─── */
export function EmptyStatePremium({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex flex-col items-center justify-center py-16 text-center", className)}
    >
      <div className="h-14 w-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4 text-muted-foreground">
        {icon || <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="text-body font-semibold text-foreground mb-1">{title}</h3>
      {description && <p className="text-meta text-muted-foreground max-w-xs leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

/* ─── Error ─── */
export function ErrorStateCalm({
  message,
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex flex-col items-center justify-center py-16 text-center", className)}
    >
      <div className="h-12 w-12 rounded-xl bg-destructive/8 flex items-center justify-center mb-4">
        <AlertTriangle className="h-5 w-5 text-destructive" />
      </div>
      <p className="text-meta font-medium text-foreground">{message || "Une erreur est survenue."}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </motion.div>
  );
}

/* ─── Success ─── */
export function SuccessStateConfirmation({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex flex-col items-center justify-center py-16 text-center", className)}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="h-14 w-14 rounded-2xl bg-success/10 flex items-center justify-center mb-4"
      >
        <CheckCircle2 className="h-7 w-7 text-success" />
      </motion.div>
      <h3 className="text-body-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="text-meta text-muted-foreground mt-1.5 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

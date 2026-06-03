/**
 * EmptyStateAI — Premium empty state respecting UNPRO strategic language.
 * Never says "Aucun lead". Uses entrepreneurMessaging.emptyStates dictionary.
 */
import { Sparkles } from "lucide-react";
import { entrepreneurMessaging } from "@/lib/copy/entrepreneurs";
import { cn } from "@/lib/utils";

type Variant = keyof typeof entrepreneurMessaging.emptyStates;

interface Props {
  variant?: Variant;
  className?: string;
}

export default function EmptyStateAI({ variant = "appointments", className }: Props) {
  const { title, body } = entrepreneurMessaging.emptyStates[variant];
  return (
    <div
      className={cn(
        "rounded-2xl p-6 text-center",
        "bg-white/[0.03] backdrop-blur-xl border border-white/10",
        className
      )}
    >
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mb-3">
        <Sparkles className="w-5 h-5 text-primary" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

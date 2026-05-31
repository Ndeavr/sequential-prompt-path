/**
 * UNPRO AI Trust — SemanticEntityChip
 * Renders an entity recognized in AI / knowledge graphs.
 */
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  type?: "service" | "city" | "brand" | "specialty" | "signal";
  strength?: number; // 0..1
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

const TYPE_TONES: Record<string, string> = {
  service: "border-cyan-400/30 bg-cyan-400/5 text-cyan-100",
  city: "border-amber-400/30 bg-amber-400/5 text-amber-100",
  brand: "border-fuchsia-400/30 bg-fuchsia-400/5 text-fuchsia-100",
  specialty: "border-emerald-400/30 bg-emerald-400/5 text-emerald-100",
  signal: "border-white/15 bg-white/5 text-white/80",
};

export default function SemanticEntityChip({
  label,
  type = "signal",
  strength,
  active,
  onClick,
  className,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium transition-all",
        TYPE_TONES[type],
        active && "ring-1 ring-offset-1 ring-offset-background ring-cyan-300",
        onClick && "hover:-translate-y-px",
        className,
      )}
    >
      <span>{label}</span>
      {typeof strength === "number" && (
        <span className="font-mono text-[10px] opacity-70">
          {Math.round(strength * 100)}
        </span>
      )}
    </button>
  );
}

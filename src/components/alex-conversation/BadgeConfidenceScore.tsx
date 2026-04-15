/**
 * BadgeConfidenceScore — Shows confidence level of Alex's understanding.
 */
import { cn } from "@/lib/utils";

interface Props {
  score: number;
  className?: string;
}

export default function BadgeConfidenceScore({ score, className }: Props) {
  const percent = Math.round(score * 100);
  const label = percent >= 85 ? "Haute confiance" : percent >= 60 ? "Bonne confiance" : "En qualification";
  const color = percent >= 85
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : percent >= 60
    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
    : "bg-amber-500/10 text-amber-400 border-amber-500/20";

  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", color, className)}>
      {label} · {percent}%
    </span>
  );
}

/**
 * UNPRO — BadgeAEOAuthority
 * Signals AI-indexed authority for AEO/SEO.
 */
import { Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export default function BadgeAEOAuthority({ className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-violet-500/15 text-violet-400 px-2 py-0.5 text-[10px] font-medium",
        className,
      )}
    >
      <Brain className="h-3 w-3" />
      Source IA vérifiée
    </span>
  );
}

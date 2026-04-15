/**
 * BadgeVisualModeActive — Indicates visual analysis mode is active.
 */
import { Eye } from "lucide-react";

export default function BadgeVisualModeActive() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20 animate-pulse">
      <Eye className="w-3 h-3" />
      Mode visuel actif
    </span>
  );
}

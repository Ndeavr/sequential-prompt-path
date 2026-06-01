/**
 * UrgencyBadge — Severity pill for diagnostic results.
 */
const STYLES = {
  low: "bg-sky-500/15 text-sky-300 border-sky-400/30",
  medium: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  high: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  critical: "bg-red-500/20 text-red-200 border-red-400/40 animate-pulse",
} as const;
const LABELS = {
  low: "Surveillance",
  medium: "À planifier",
  high: "Action requise",
  critical: "Urgence",
} as const;

export default function UrgencyBadge({ level }: { level: keyof typeof STYLES }) {
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${STYLES[level]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {LABELS[level]}
    </span>
  );
}

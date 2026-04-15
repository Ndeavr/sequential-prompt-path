import { AlertTriangle } from "lucide-react";

interface BannerGoLiveBlockerProps {
  blockers: { title: string; component: string; severity: string }[];
}

export default function BannerGoLiveBlocker({ blockers }: BannerGoLiveBlockerProps) {
  const critical = blockers.filter(b => b.severity === "critical");
  if (critical.length === 0) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <span className="font-semibold text-red-400 text-sm">
          {critical.length} blocage{critical.length > 1 ? "s" : ""} critique{critical.length > 1 ? "s" : ""} — Go-live impossible
        </span>
      </div>
      <ul className="space-y-1">
        {critical.map((b, i) => (
          <li key={i} className="text-xs text-red-300 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
            <span className="font-medium">{b.component}:</span>
            <span>{b.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

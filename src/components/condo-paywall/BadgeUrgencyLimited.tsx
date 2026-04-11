import { Clock } from "lucide-react";

export default function BadgeUrgencyLimited() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
      <Clock className="h-3 w-3" />
      Accès limité
    </span>
  );
}

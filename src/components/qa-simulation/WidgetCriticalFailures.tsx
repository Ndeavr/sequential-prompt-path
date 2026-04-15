import { XCircle } from "lucide-react";

interface Props {
  count: number;
}

export default function WidgetCriticalFailures({ count }: Props) {
  return (
    <div className={`glass-card rounded-xl p-3 text-center ${count > 0 ? "border border-red-500/30" : ""}`}>
      <XCircle className={`w-5 h-5 mx-auto mb-1 ${count > 0 ? "text-red-400" : "text-emerald-400"}`} />
      <p className={`text-lg font-bold ${count > 0 ? "text-red-400" : "text-emerald-400"}`}>{count}</p>
      <p className="text-xs text-muted-foreground">Échecs critiques</p>
    </div>
  );
}

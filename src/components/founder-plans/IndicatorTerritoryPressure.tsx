import { cn } from "@/lib/utils";

export default function IndicatorTerritoryPressure({ score }: { score: number }) {
  const color =
    score >= 80 ? "bg-red-500" : score >= 50 ? "bg-orange-500" : "bg-green-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Pression de marché</span>
        <span className="font-semibold text-foreground">{score}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

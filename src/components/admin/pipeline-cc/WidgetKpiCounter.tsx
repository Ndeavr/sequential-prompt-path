import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
  hint?: string;
}

const toneCls: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-emerald-400",
  warning: "text-amber-400",
  danger:  "text-red-400",
};

export default function WidgetKpiCounter({ label, value, icon: Icon, tone = "default", hint }: Props) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">{label}</p>
            <p className={cn("text-xl md:text-2xl font-bold tabular-nums mt-1", toneCls[tone])}>{value}</p>
            {hint && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
          </div>
          <div className={cn("p-1.5 rounded-lg bg-muted/40 shrink-0", toneCls[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

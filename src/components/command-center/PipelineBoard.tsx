/**
 * UNPRO — Pipeline Board
 */
import { Badge } from "@/components/ui/badge";
import type { PipelineColumn } from "@/services/dynamicPricingEngine";

type Props = {
  columns: PipelineColumn[];
  onSelect: (id: string) => void;
};

export default function PipelineBoard({ columns, onSelect }: Props) {
  const nonEmpty = columns.filter(c => c.count > 0 || ["imported", "sent", "converted"].includes(c.stage));

  return (
    <div className="rounded-xl border border-border/20 bg-card/20 backdrop-blur-sm">
      <div className="px-4 py-3 border-b border-border/10">
        <span className="text-sm font-semibold">Pipeline</span>
      </div>
      <div className="flex overflow-x-auto gap-0 divide-x divide-border/10">
        {nonEmpty.map(col => (
          <div key={col.stage} className="flex-shrink-0 min-w-[120px] p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{col.label}</div>
            <div className="text-xl font-bold text-foreground">{col.count}</div>
            {col.deltaVsYesterday !== 0 && (
              <span className={`text-[10px] ${col.deltaVsYesterday > 0 ? "text-green-400" : "text-red-400"}`}>
                {col.deltaVsYesterday > 0 ? "+" : ""}{col.deltaVsYesterday}
              </span>
            )}
            <div className="mt-2 space-y-1">
              {col.leads.slice(0, 3).map(l => (
                <div
                  key={l.id}
                  className="text-[11px] truncate text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => onSelect(l.id)}
                >
                  {l.businessName}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

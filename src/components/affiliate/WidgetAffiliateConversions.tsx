/**
 * UNPRO — Affiliate Conversions Widget
 */
import { ArrowRight } from "lucide-react";

interface ConversionStep {
  label: string;
  count: number;
}

interface Props {
  steps: ConversionStep[];
}

const WidgetAffiliateConversions = ({ steps }: Props) => {
  return (
    <div className="rounded-xl border border-border/30 bg-card p-5 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Funnel de conversion</h3>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-1 shrink-0">
            <div className="text-center px-3 py-2 rounded-lg bg-muted/30 min-w-[80px]">
              <div className="text-lg font-bold text-foreground">{step.count}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{step.label}</div>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WidgetAffiliateConversions;

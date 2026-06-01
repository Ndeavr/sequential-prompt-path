/**
 * PanelQuoteIntelligenceInsights
 * Additive insights block surfaced under the comparison table.
 * Renders scopeGaps / priceAnomalies / homeownerQuestions when present.
 */
import { motion } from "framer-motion";
import { ScanSearch, TrendingUp, HelpCircle } from "lucide-react";
import type { QuoteAnalysisPayload } from "../services/quoteAnalysisClient";

interface Props {
  payload: QuoteAnalysisPayload;
}

function Block({
  icon: Icon,
  title,
  items,
  accent,
}: {
  icon: typeof ScanSearch;
  title: string;
  items: string[];
  accent: string;
}) {
  if (!items?.length) return null;
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${accent}`} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-xs text-muted-foreground leading-relaxed pl-4 relative">
            <span className={`absolute left-0 top-1.5 h-1 w-1 rounded-full ${accent.replace("text-", "bg-")}`} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PanelQuoteIntelligenceInsights({ payload }: Props) {
  const hasAny =
    (payload.scopeGaps?.length ?? 0) +
      (payload.priceAnomalies?.length ?? 0) +
      (payload.homeownerQuestions?.length ?? 0) >
    0;
  if (!hasAny) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-3"
    >
      <Block
        icon={ScanSearch}
        title="Écarts entre soumissions"
        items={payload.scopeGaps ?? []}
        accent="text-sky-500"
      />
      <Block
        icon={TrendingUp}
        title="Anomalies de prix"
        items={payload.priceAnomalies ?? []}
        accent="text-amber-500"
      />
      <Block
        icon={HelpCircle}
        title="Questions à poser"
        items={payload.homeownerQuestions ?? []}
        accent="text-primary"
      />
    </motion.div>
  );
}

/**
 * UNPRO — Contractor Comparison View
 * Desktop: table layout. Mobile: card stack with expandable rows.
 * Never ranks — explains differences.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, Fingerprint, Shield, FileText, CheckCircle,
  MapPin, Globe, FileCheck, AlertCircle, MessageCircle,
  ChevronDown, ChevronUp, X, Info, Scale, Sparkles,
} from "lucide-react";
import {
  compareContractors,
  type ComparisonContractor,
  type ComparisonCellValue,
  type ComparisonRow,
  type ComparisonInsight,
} from "@/services/contractor/comparisonEngine";
import { useIsMobile } from "@/hooks/use-mobile";

interface ContractorComparisonViewProps {
  contractors: ComparisonContractor[];
  onRemove?: (id: string) => void;
  targetCity?: string;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  "shield-check": ShieldCheck,
  fingerprint: Fingerprint,
  shield: Shield,
  "file-text": FileText,
  "check-circle": CheckCircle,
  "map-pin": MapPin,
  globe: Globe,
  "file-check": FileCheck,
  "alert-circle": AlertCircle,
  "message-circle": MessageCircle,
};

const VARIANT_STYLES: Record<ComparisonCellValue["variant"], string> = {
  positive: "text-success",
  neutral: "text-foreground",
  caution: "text-warning",
  missing: "text-muted-foreground",
};

const VARIANT_BG: Record<ComparisonCellValue["variant"], string> = {
  positive: "bg-success/8",
  neutral: "bg-muted/40",
  caution: "bg-warning/8",
  missing: "bg-muted/20",
};

// ─── Cell Component ───

const ComparisonCell = ({ cell }: { cell: ComparisonCellValue }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className={`text-xs font-semibold ${VARIANT_STYLES[cell.variant]}`}>
      {cell.display}
    </span>
    {cell.detail && (
      <span className="text-[10px] text-muted-foreground text-center leading-tight">
        {cell.detail}
      </span>
    )}
  </div>
);

// ─── Mobile Card Row ───

const MobileComparisonRow = ({
  row,
  contractors,
}: {
  row: ComparisonRow;
  contractors: ComparisonContractor[];
}) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = ICON_MAP[row.icon] ?? Info;

  return (
    <div className="border-b border-border/30 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">{row.label}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {contractors.map((c) => {
                const cell = row.cells[c.id];
                if (!cell) return null;
                return (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between p-2 rounded-lg ${VARIANT_BG[cell.variant]}`}
                  >
                    <span className="text-xs font-medium truncate max-w-[120px]">
                      {c.business_name}
                    </span>
                    <ComparisonCell cell={cell} />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Insight Card ───

const InsightCard = ({ insight }: { insight: ComparisonInsight }) => {
  const toneStyle =
    insight.tone === "positive"
      ? "border-success/20 bg-success/5"
      : insight.tone === "caution"
        ? "border-warning/20 bg-warning/5"
        : "border-border/30 bg-muted/20";

  return (
    <div className={`p-2.5 rounded-lg border text-xs ${toneStyle}`}>
      {insight.text_fr}
    </div>
  );
};

// ─── Main Component ───

const ContractorComparisonView = ({
  contractors,
  onRemove,
  targetCity,
}: ContractorComparisonViewProps) => {
  const isMobile = useIsMobile();
  const result = compareContractors(contractors, { targetCity });

  if (contractors.length < 2) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="w-5 h-5 text-primary" />
            Comparaison d'entrepreneurs
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{result.summary_fr}</p>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Contractor Headers */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
            {contractors.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30 min-w-0 shrink-0"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {c.logo_url ? (
                    <img src={c.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <span className="font-bold text-xs text-muted-foreground">
                      {(c.business_name ?? "?")[0]}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold truncate block max-w-[100px]">
                    {c.business_name}
                  </span>
                  {c.city && (
                    <span className="text-[10px] text-muted-foreground">{c.city}</span>
                  )}
                </div>
                {onRemove && (
                  <button
                    onClick={() => onRemove(c.id)}
                    className="text-muted-foreground hover:text-destructive ml-1 shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          {!isMobile && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-xs text-muted-foreground p-2 w-44">
                      Dimension
                    </th>
                    {contractors.map((c) => (
                      <th key={c.id} className="p-2 text-center min-w-[140px]">
                        <span className="text-xs font-semibold">{c.business_name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => {
                    const Icon = ICON_MAP[row.icon] ?? Info;
                    return (
                      <tr key={row.key} className="border-t border-border/20">
                        <td className="p-2">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="text-xs font-medium">{row.label}</span>
                          </div>
                        </td>
                        {contractors.map((c) => {
                          const cell = row.cells[c.id];
                          return (
                            <td key={c.id} className="p-2 text-center">
                              {cell && <ComparisonCell cell={cell} />}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile Card Stack */}
          {isMobile && (
            <div className="rounded-lg border border-border/30 overflow-hidden">
              {result.rows.map((row) => (
                <MobileComparisonRow key={row.key} row={row} contractors={contractors} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      {result.insights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              Observations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
            <p className="text-[10px] text-muted-foreground flex items-start gap-1 mt-2">
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              Ces observations sont basées sur les données disponibles. Elles ne constituent pas un classement ni une recommandation formelle.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContractorComparisonView;

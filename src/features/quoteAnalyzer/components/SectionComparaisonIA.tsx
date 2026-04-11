import { BarChart3, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface AnalysisResult {
  quotes: Array<{
    slot: number;
    vendor: string;
    amount: number;
    warranty: string;
    score: number;
    isBestValue?: boolean;
    risks: string[];
    inclusions: string[];
    exclusions: string[];
  }>;
  recommendation: string;
  confidenceScore: number;
}

interface Props {
  result: AnalysisResult;
}

export default function SectionComparaisonIA({ result }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <h2 className="text-lg font-bold text-foreground">Résultat de l'analyse IA</h2>

      {/* Comparison table */}
      <div className="rounded-2xl border border-border/50 overflow-hidden bg-card/80">
        <div className={`grid gap-0 text-center bg-muted/30 border-b border-border/40`}
          style={{ gridTemplateColumns: `120px repeat(${result.quotes.length}, 1fr)` }}>
          <div className="p-3 text-xs font-semibold text-muted-foreground">Critère</div>
          {result.quotes.map((q) => (
            <div key={q.slot} className={`p-3 text-xs font-semibold ${q.isBestValue ? "text-emerald-600 bg-emerald-500/5" : "text-muted-foreground"}`}>
              {q.vendor} {q.isBestValue && "⭐"}
            </div>
          ))}
        </div>

        {[
          { label: "Prix", key: "amount", format: (v: any) => `${v.toLocaleString("fr-CA")} $` },
          { label: "Garantie", key: "warranty", format: (v: any) => v },
          { label: "Score IA", key: "score", format: (v: any) => `${v}/100` },
        ].map((row, i) => (
          <div key={row.label}
            className={`grid gap-0 text-center ${i < 2 ? "border-b border-border/20" : ""}`}
            style={{ gridTemplateColumns: `120px repeat(${result.quotes.length}, 1fr)` }}>
            <div className="p-3 text-xs font-medium text-foreground text-left">{row.label}</div>
            {result.quotes.map((q) => (
              <div key={q.slot} className={`p-3 text-xs ${q.isBestValue ? "font-semibold text-foreground bg-emerald-500/5" : "text-muted-foreground"}`}>
                {row.format((q as any)[row.key])}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Risks */}
      {result.quotes.some((q) => q.risks.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Risques détectés</h3>
          </div>
          {result.quotes.filter((q) => q.risks.length > 0).map((q) => (
            <div key={q.slot} className="text-xs text-muted-foreground pl-6">
              <span className="font-medium text-foreground">{q.vendor} :</span> {q.risks.join(", ")}
            </div>
          ))}
        </div>
      )}

      {/* Recommendation */}
      <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Recommandation</p>
          <p className="text-xs text-muted-foreground mt-1">{result.recommendation}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-2">Confiance : {result.confidenceScore}%</p>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * PanelQuoteAnalysisAI — Upload quotes, auto-analyze, show quality/price/risk scores.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, CheckCircle2, AlertTriangle, TrendingDown } from "lucide-react";

interface AnalysisResult {
  qualityScore: number;
  priceScore: number;
  riskScore: number;
  recommendation: string;
  highlights: string[];
  warnings: string[];
}

const MOCK_RESULT: AnalysisResult = {
  qualityScore: 82,
  priceScore: 71,
  riskScore: 23,
  recommendation: "La soumission B offre le meilleur rapport qualité-prix avec des garanties solides.",
  highlights: ["Garantie 10 ans incluse", "Matériaux certifiés", "Références vérifiables"],
  warnings: ["Soumission A manque de détails sur les matériaux", "Soumission C n'inclut pas les permis"],
};

export default function PanelQuoteAnalysisAI() {
  const [files, setFiles] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleUpload = () => {
    const name = `Soumission_${files.length + 1}.pdf`;
    setFiles([...files, name]);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    await new Promise(r => setTimeout(r, 2000));
    setResult(MOCK_RESULT);
    setAnalyzing(false);
  };

  const ScoreBar = ({ label, score, color }: { label: string; score: number; color: string }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{score}/100</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Analyse IA de soumissions</h3>
      <p className="text-xs text-muted-foreground">Uploadez jusqu'à 3 soumissions pour une analyse comparative.</p>

      {/* Upload area */}
      <div className="space-y-2">
        {files.map((f, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border/40">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-xs text-foreground">{f}</span>
          </div>
        ))}
        {files.length < 3 && (
          <button
            onClick={handleUpload}
            className="w-full py-3 rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground
              hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" /> Ajouter une soumission
          </button>
        )}
      </div>

      {files.length >= 2 && !result && (
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm
            disabled:opacity-50 hover:bg-primary/90 transition-all"
        >
          {analyzing ? "Analyse en cours…" : "Analyser avec l'IA"}
        </button>
      )}

      {result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="space-y-3">
            <ScoreBar label="Qualité" score={result.qualityScore} color="bg-green-500" />
            <ScoreBar label="Prix" score={result.priceScore} color="bg-primary" />
            <ScoreBar label="Risque" score={result.riskScore} color="bg-red-500" />
          </div>

          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-xs text-foreground">{result.recommendation}</p>
          </div>

          <div className="space-y-1.5">
            {result.highlights.map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-green-400">
                <CheckCircle2 className="w-3 h-3" /> {h}
              </div>
            ))}
            {result.warnings.map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-yellow-400">
                <AlertTriangle className="w-3 h-3" /> {w}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

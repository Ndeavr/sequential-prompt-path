import { useState } from "react";
import UploaderSoumissionComparativeSlot from "./UploaderSoumissionComparativeSlot";
import { Button } from "@/components/ui/button";
import { Brain, ArrowRight } from "lucide-react";
import BadgeUsageSoumission from "./BadgeUsageSoumission";

interface Props {
  onStartAnalysis?: (files: (File | null)[]) => void;
  isAnalyzing?: boolean;
}

export default function PanelDropzoneSoumissionComparative({ onStartAnalysis, isAnalyzing }: Props) {
  const [files, setFiles] = useState<(File | null)[]>([null, null, null]);

  const setSlot = (index: number, file: File | null) => {
    setFiles((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
  };

  const filledCount = files.filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Importez vos soumissions</h3>
          <p className="text-xs text-muted-foreground">1 à 3 fichiers maximum</p>
        </div>
        <BadgeUsageSoumission type="comparison" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((n, i) => (
          <UploaderSoumissionComparativeSlot
            key={n}
            slotIndex={n}
            file={files[i]}
            onFileSelect={(f) => setSlot(i, f)}
          />
        ))}
      </div>

      <Button
        onClick={() => onStartAnalysis?.(files)}
        disabled={filledCount < 1 || isAnalyzing}
        className="w-full rounded-xl gap-2"
        size="lg"
      >
        <Brain className="h-4 w-4" />
        {isAnalyzing ? "Analyse en cours…" : `Analyser ${filledCount} soumission${filledCount > 1 ? "s" : ""}`}
        {!isAnalyzing && <ArrowRight className="h-4 w-4" />}
      </Button>
    </div>
  );
}

import { useState } from "react";
import UploaderSoumissionComparativeSlot from "./UploaderSoumissionComparativeSlot";
import SlotUploadVerrouille from "./SlotUploadVerrouille";
import ModalUpsellPasseportMaison from "./ModalUpsellPasseportMaison";
import { Button } from "@/components/ui/button";
import { Brain, ArrowRight } from "lucide-react";
import BadgeUsageSoumission from "./BadgeUsageSoumission";

interface Props {
  onStartAnalysis?: (files: (File | null)[]) => void;
  isAnalyzing?: boolean;
}

export default function PanelDropzoneSoumissionComparative({ onStartAnalysis, isAnalyzing }: Props) {
  const [files, setFiles] = useState<(File | null)[]>([null, null, null]);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [upsellTier, setUpsellTier] = useState<"passeport" | "gold">("passeport");

  const setSlot = (index: number, file: File | null) => {
    setFiles((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
  };

  const filledCount = files.filter(Boolean).length;

  const openUpsell = (tier: "passeport" | "gold") => {
    setUpsellTier(tier);
    setUpsellOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Importez vos soumissions</h3>
          <p className="text-xs text-muted-foreground">
            {filledCount > 0 ? `${filledCount} soumission${filledCount > 1 ? "s" : ""} prête${filledCount > 1 ? "s" : ""}` : "Glissez vos PDF ou images"}
          </p>
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

      <div className="space-y-2">
        <SlotUploadVerrouille tier="passeport" onClick={() => openUpsell("passeport")} />
        <SlotUploadVerrouille tier="gold" onClick={() => openUpsell("gold")} />
      </div>

      <Button
        onClick={() => onStartAnalysis?.(files)}
        disabled={filledCount < 1 || isAnalyzing}
        className="w-full rounded-xl gap-2"
        size="lg"
      >
        <Brain className="h-4 w-4" />
        {isAnalyzing ? "Analyse en cours…" : "Analyser mes soumissions"}
        {!isAnalyzing && <ArrowRight className="h-4 w-4" />}
      </Button>

      <ModalUpsellPasseportMaison
        open={upsellOpen}
        onOpenChange={setUpsellOpen}
        highlight={upsellTier}
      />
    </div>
  );
}

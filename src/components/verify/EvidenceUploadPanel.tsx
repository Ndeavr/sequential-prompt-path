/**
 * UNPRO — EvidenceUploadPanel
 * Upload business card, truck photo, contract, or quote as verification evidence.
 */
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, CreditCard, Truck, FileText, Receipt, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { EvidenceType } from "@/types/verification";

const EVIDENCE_TYPES: { key: EvidenceType; label: string; icon: React.ElementType }[] = [
  { key: "business_card", label: "Carte d'affaires", icon: CreditCard },
  { key: "truck", label: "Photo de camion", icon: Truck },
  { key: "contract", label: "Contrat", icon: FileText },
  { key: "quote", label: "Soumission", icon: Receipt },
];

interface Props {
  onUpload: (base64: string, type: EvidenceType) => void;
  isLoading?: boolean;
}

export default function EvidenceUploadPanel({ onUpload, isLoading }: Props) {
  const [selectedType, setSelectedType] = useState<EvidenceType>("business_card");
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier ne doit pas dépasser 10 Mo.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!preview) return;
    const base64 = preview.split(",")[1];
    onUpload(base64, selectedType);
  };

  const clearPreview = () => {
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 md:p-6">
      <h3 className="text-sm font-semibold font-display text-foreground mb-1">Ajouter une preuve</h3>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        Ajoutez une preuve pour améliorer la correspondance si les données sont insuffisantes.
      </p>

      {/* Type selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {EVIDENCE_TYPES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSelectedType(key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
              selectedType === key
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Upload area */}
      {!preview ? (
        <label className="flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed border-border/50 hover:border-primary/30 cursor-pointer transition-colors bg-muted/20">
          <Upload className="w-6 h-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Glissez ou cliquez pour téléverser</span>
          <span className="text-[10px] text-muted-foreground/50">JPEG, PNG, PDF — max 10 Mo</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFile}
            className="hidden"
          />
        </label>
      ) : (
        <div className="relative">
          <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
            {preview.startsWith("data:image") ? (
              <img src={preview} alt="Preuve" className="w-full max-h-48 object-contain" />
            ) : (
              <div className="flex items-center justify-center p-8 gap-2 text-muted-foreground">
                <Image className="w-5 h-5" />
                <span className="text-sm">Document sélectionné</span>
              </div>
            )}
          </div>
          <button
            onClick={clearPreview}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {preview && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
          <Button onClick={handleSubmit} disabled={isLoading} className="w-full gap-2">
            <Upload className="w-4 h-4" />
            {isLoading ? "Analyse en cours…" : "Soumettre cette preuve"}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

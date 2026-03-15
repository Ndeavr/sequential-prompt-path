/**
 * EvidenceUploadPanel — Upload business card, truck photo, contract, or quote.
 *
 * Product rules:
 * - Accessible: proper labels, keyboard-navigable type buttons
 * - Clear file states
 * - Anti-hallucination: explains that analysis uses only extracted data
 */
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, CreditCard, Truck, FileText, Receipt, X, Image, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { EvidenceType } from "@/types/verification";

const EVIDENCE_TYPES: { key: EvidenceType; label: string; icon: React.ElementType; description: string }[] = [
  { key: "business_card", label: "Carte d'affaires", icon: CreditCard, description: "Photo d'une carte d'affaires" },
  { key: "truck", label: "Photo de camion", icon: Truck, description: "Photo d'un véhicule identifié" },
  { key: "contract", label: "Contrat", icon: FileText, description: "Document contractuel" },
  { key: "quote", label: "Soumission", icon: Receipt, description: "Soumission ou devis reçu" },
];

const MAX_SIZE_MB = 10;

interface Props {
  onUpload: (base64: string, type: EvidenceType) => void;
  isLoading?: boolean;
}

export default function EvidenceUploadPanel({ onUpload, isLoading }: Props) {
  const [selectedType, setSelectedType] = useState<EvidenceType>("business_card");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Le fichier ne doit pas dépasser ${MAX_SIZE_MB} Mo.`);
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!preview) return;
    const base64 = preview.split(",")[1];
    onUpload(base64, selectedType);
  };

  const clearPreview = () => {
    setPreview(null);
    setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 md:p-6"
      role="region"
      aria-label="Téléversement de preuve"
    >
      <h3 className="text-sm font-semibold font-display text-foreground mb-1">
        Ajouter une preuve
      </h3>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        Ajoutez un document pour améliorer la correspondance.
        Seules les informations directement extraites du document seront utilisées — rien n'est inventé.
      </p>

      {/* Type selector — keyboard accessible */}
      <fieldset className="mb-4">
        <legend className="sr-only">Type de preuve</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {EVIDENCE_TYPES.map(({ key, label, icon: Icon, description }) => (
            <button
              key={key}
              role="radio"
              aria-checked={selectedType === key}
              aria-label={description}
              onClick={() => setSelectedType(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none ${
                selectedType === key
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Upload area */}
      {!preview ? (
        <label
          className="flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed border-border/50 hover:border-primary/30 cursor-pointer transition-colors bg-muted/20 focus-within:ring-2 focus-within:ring-primary/40"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
        >
          <Upload className="w-6 h-6 text-muted-foreground" aria-hidden="true" />
          <span className="text-xs text-muted-foreground text-center">
            Glissez ou cliquez pour téléverser
          </span>
          <span className="text-[10px] text-muted-foreground/50">
            JPEG, PNG, PDF — max {MAX_SIZE_MB} Mo
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFile}
            className="sr-only"
            aria-label="Sélectionner un fichier"
          />
        </label>
      ) : (
        <div className="relative">
          <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
            {preview.startsWith("data:image") ? (
              <img
                src={preview}
                alt={`Aperçu : ${fileName}`}
                className="w-full max-h-48 object-contain"
              />
            ) : (
              <div className="flex items-center justify-center p-8 gap-2 text-muted-foreground">
                <Image className="w-5 h-5" aria-hidden="true" />
                <span className="text-sm">{fileName || "Document sélectionné"}</span>
              </div>
            )}
          </div>
          <button
            onClick={clearPreview}
            aria-label="Retirer le fichier"
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {preview && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyse en cours…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Soumettre cette preuve
              </>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

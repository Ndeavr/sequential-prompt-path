import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
  preview?: string | null;
  onClear?: () => void;
}

export default function DropzoneBusinessCardScan({ onFileSelected, isProcessing, preview, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    onFileSelected(file);
  }, [onFileSelected]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  if (preview) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative rounded-xl overflow-hidden border border-border bg-card"
      >
        <img src={preview} alt="Carte importée" className="w-full max-h-64 object-contain bg-muted/30" />
        {onClear && !isProcessing && (
          <button
            onClick={onClear}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-destructive/20 transition-colors"
          >
            <X className="w-4 h-4 text-foreground" />
          </button>
        )}
        {isProcessing && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-muted-foreground">Extraction en cours…</span>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={onDrop}
      className={`
        relative rounded-xl border-2 border-dashed transition-all duration-200 p-8
        ${isDragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-muted-foreground/40"}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-primary" />
        </div>

        <div>
          <p className="text-sm font-medium text-foreground">Importez une carte d'affaires</p>
          <p className="text-xs text-muted-foreground mt-1">Glissez une image ou utilisez la caméra</p>
        </div>

        <div className="flex gap-3">
          <Button
            size="sm"
            variant="default"
            onClick={() => cameraRef.current?.click()}
            className="gap-2"
          >
            <Camera className="w-4 h-4" />
            Caméra
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Fichier
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

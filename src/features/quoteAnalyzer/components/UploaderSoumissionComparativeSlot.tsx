import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  slotIndex: number;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  isUploading?: boolean;
  isProcessed?: boolean;
  parsedVendor?: string;
  parsedAmount?: number;
}

export default function UploaderSoumissionComparativeSlot({
  slotIndex, file, onFileSelect, isUploading, isProcessed, parsedVendor, parsedAmount,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFileSelect(f);
  };

  if (file) {
    return (
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col items-center gap-2 min-h-[140px] justify-center"
      >
        <button
          onClick={() => onFileSelect(null)}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-destructive/10 transition-colors"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        {isUploading ? (
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        ) : isProcessed ? (
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        ) : (
          <FileText className="h-6 w-6 text-primary" />
        )}

        <p className="text-xs font-medium text-foreground text-center truncate max-w-full px-2">
          {file.name}
        </p>

        {parsedVendor && (
          <p className="text-[10px] text-muted-foreground">{parsedVendor}</p>
        )}
        {parsedAmount != null && (
          <p className="text-xs font-semibold text-foreground">
            {parsedAmount.toLocaleString("fr-CA")} $
          </p>
        )}

        <span className="text-[10px] text-primary/60 font-medium">Soumission {slotIndex}</span>
      </motion.div>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className="rounded-xl border-2 border-dashed border-border/50 hover:border-primary/40 bg-muted/20 hover:bg-primary/5 transition-all cursor-pointer p-4 flex flex-col items-center gap-2 min-h-[140px] justify-center"
    >
      <Upload className="h-5 w-5 text-primary/40" />
      <p className="text-xs font-medium text-muted-foreground">Soumission {slotIndex}</p>
      <p className="text-[10px] text-muted-foreground/60">PDF ou image</p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
      />
    </div>
  );
}

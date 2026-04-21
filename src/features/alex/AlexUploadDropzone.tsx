/**
 * Alex 100M — Upload Dropzone
 * Click + drag/drop. Marks valid engagement.
 */

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, ImagePlus } from "lucide-react";
import { useAlexStore } from "./state/alexStore";

interface AlexUploadDropzoneProps {
  onUpload: () => void;
}

export function AlexUploadDropzone({ onUpload }: AlexUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lang = useAlexStore((s) => s.activeLanguage);

  const handleFiles = useCallback(() => {
    onUpload();
  }, [onUpload]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) handleFiles();
    },
    [handleFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) handleFiles();
    },
    [handleFiles]
  );

  return (
    <div className="px-4 py-2">
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed cursor-pointer transition-all duration-200 ${
          isDragging
            ? "border-primary/60 bg-primary/10"
            : "border-border/30 bg-card/30 hover:border-primary/30 hover:bg-primary/5"
        }`}
        whileTap={{ scale: 0.98 }}
      >
        <AnimatePresence mode="wait">
          {isDragging ? (
            <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-primary text-xs">
              <Upload className="w-4 h-4" />
              <span>{lang === "fr-CA" ? "Déposez ici" : "Drop here"}</span>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-muted-foreground text-xs">
              <ImagePlus className="w-4 h-4" />
              <span>{lang === "fr-CA" ? "Photo ou fichier" : "Photo or file"}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <input ref={inputRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleChange} />
      </motion.div>
    </div>
  );
}

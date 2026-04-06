/**
 * UploadPhotoModal — Drag & drop photo upload modal triggered by Alex conversation.
 * Appears only when Alex asks the user for a photo and the user confirms.
 */
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Image, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadPhotoModalProps {
  open: boolean;
  onClose: () => void;
  onFilesSelected: (files: File[]) => void;
}

export default function UploadPhotoModal({ open, onClose, onFilesSelected }: UploadPhotoModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith("image/") || f.type === "application/pdf"
    );
    if (files.length > 0) {
      onFilesSelected(files);
      onClose();
    }
  }, [onFilesSelected, onClose]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
      onClose();
    }
    e.target.value = "";
  }, [onFilesSelected, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-3xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, hsl(228 40% 12%) 0%, hsl(228 40% 8%) 100%)",
              border: "1px solid hsl(222 100% 70% / 0.15)",
              boxShadow: "0 25px 60px -15px rgba(0,0,0,0.5), 0 0 80px -20px hsl(222 100% 60% / 0.15)",
            }}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
            >
              <X className="h-4 w-4 text-white/50" />
            </button>

            <div className="p-6 pt-8">
              <h3 className="text-lg font-bold text-white text-center mb-1">
                Téléversez votre photo
              </h3>
              <p className="text-sm text-white/50 text-center mb-6">
                Alex va analyser l'image pour identifier le problème.
              </p>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className="relative rounded-2xl p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200"
                style={{
                  border: isDragging
                    ? "2px dashed hsl(222 100% 65% / 0.6)"
                    : "2px dashed hsl(222 100% 65% / 0.2)",
                  background: isDragging
                    ? "hsl(222 100% 50% / 0.08)"
                    : "hsl(222 100% 50% / 0.03)",
                  minHeight: 160,
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <motion.div
                  animate={isDragging ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, hsl(222 100% 50% / 0.2), hsl(222 100% 35% / 0.15))",
                    border: "1px solid hsl(222 100% 70% / 0.15)",
                  }}
                >
                  <Upload className="h-6 w-6 text-[hsl(222,100%,70%)]" />
                </motion.div>

                <div className="text-center">
                  <p className="text-sm font-medium text-white/80">
                    {isDragging ? "Déposez ici" : "Glissez une photo ici"}
                  </p>
                  <p className="text-xs text-white/35 mt-1">
                    ou cliquez pour sélectionner
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-5">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 rounded-xl gap-2 h-12"
                  style={{
                    background: "linear-gradient(135deg, hsl(222 100% 55%), hsl(222 100% 42%))",
                    color: "#fff",
                  }}
                >
                  <Image className="h-4 w-4" />
                  Galerie
                </Button>
                <Button
                  onClick={() => {
                    // On mobile, capture=environment opens camera
                    const input = fileInputRef.current;
                    if (input) {
                      input.setAttribute("capture", "environment");
                      input.click();
                      // Remove capture after so gallery still works
                      setTimeout(() => input.removeAttribute("capture"), 100);
                    }
                  }}
                  variant="outline"
                  className="flex-1 rounded-xl gap-2 h-12 border-white/10 text-white/80 hover:bg-white/5"
                >
                  <Camera className="h-4 w-4" />
                  Caméra
                </Button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

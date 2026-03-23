/**
 * Optional photo upload step for the booking flow.
 * Lets clients attach photos of their issue before confirming.
 */
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingPhotoUploadProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  maxPhotos?: number;
}

export function BookingPhotoUpload({
  photos,
  onPhotosChange,
  maxPhotos = 4,
}: BookingPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const newPhotos = [...photos];
    for (let i = 0; i < files.length && newPhotos.length < maxPhotos; i++) {
      if (files[i].type.startsWith("image/")) {
        newPhotos.push(files[i]);
      }
    }
    onPhotosChange(newPhotos);
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-border/60 bg-card p-5 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Camera className="w-4 h-4 text-primary" />
        <h3 className="text-body font-semibold text-foreground">
          Photos <span className="text-muted-foreground font-normal">(optionnel)</span>
        </h3>
      </div>

      <p className="text-caption text-muted-foreground">
        Ajoutez des photos pour aider à mieux préparer la visite
      </p>

      {/* Thumbnails */}
      <AnimatePresence>
        {photos.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-4 gap-2"
          >
            {photos.map((file, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative aspect-square rounded-lg overflow-hidden border border-border/40"
              >
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop zone */}
      {photos.length < maxPhotos && (
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          className={cn(
            "w-full rounded-xl border-2 border-dashed p-6 flex flex-col items-center gap-2 transition-all",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border/40 hover:border-primary/30 hover:bg-primary/[0.02]"
          )}
        >
          <ImagePlus className="w-6 h-6 text-muted-foreground" />
          <span className="text-caption text-muted-foreground">
            {photos.length === 0 ? "Ajouter des photos" : `Ajouter (${maxPhotos - photos.length} restantes)`}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />
    </motion.div>
  );
}

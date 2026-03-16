/**
 * UNPRO Design — Premium Upload Screen
 */
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Camera, Image, Sparkles, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROOM_TYPES } from "./data";

interface Props {
  onUpload: (file: File, roomType?: string) => void;
}

export default function DesignUpload({ onUpload }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSubmit = () => {
    if (file) onUpload(file, selectedRoom ?? undefined);
  };

  const clearPreview = () => {
    setPreview(null);
    setFile(null);
    setSelectedRoom(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
          >
            <Sparkles className="w-4 h-4" />
            UNPRO Design
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
            Transformez votre espace
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Téléversez une photo de votre pièce et laissez l'IA vous proposer des transformations.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!preview ? (
            /* Drop Zone */
            <motion.div
              key="dropzone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`
                relative cursor-pointer rounded-2xl border-2 border-dashed p-12
                transition-all duration-300 group
                ${dragOver
                  ? "border-primary bg-primary/5 shadow-[var(--shadow-glow)]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
                }
              `}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <Upload className="w-7 h-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-foreground font-semibold text-lg">
                    Glissez votre photo ici
                  </p>
                  <p className="text-muted-foreground text-sm mt-1">
                    ou cliquez pour parcourir • JPG, PNG, WebP
                  </p>
                </div>
                <div className="flex gap-3 mt-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Camera className="w-4 h-4" />
                    Prendre une photo
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Image className="w-4 h-4" />
                    Galerie
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Preview & Room Selection */
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Image Preview */}
              <div className="relative rounded-2xl overflow-hidden bg-card border border-border shadow-[var(--shadow-lg)]">
                <img
                  src={preview}
                  alt="Aperçu"
                  className="w-full h-64 md:h-80 object-cover"
                />
                <button
                  onClick={clearPreview}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>
                <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-background/80 backdrop-blur-sm text-sm text-foreground font-medium">
                  Photo prête
                </div>
              </div>

              {/* Room Type Selection */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  Quel type de pièce ? (optionnel — l'IA peut le détecter)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ROOM_TYPES.map((room) => (
                    <button
                      key={room.key}
                      onClick={() => setSelectedRoom(selectedRoom === room.key ? null : room.key)}
                      className={`
                        px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                        ${selectedRoom === room.key
                          ? "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                          : "bg-card border border-border text-foreground hover:border-primary/50"
                        }
                      `}
                    >
                      <span className="mr-1.5">{room.icon}</span>
                      {room.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <Button
                onClick={handleSubmit}
                size="lg"
                className="w-full gap-2 h-12 text-base font-semibold"
              >
                <Sparkles className="w-5 h-5" />
                Commencer le design
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

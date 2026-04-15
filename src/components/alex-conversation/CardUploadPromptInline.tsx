/**
 * CardUploadPromptInline — Alex asks for a photo within the chat flow.
 */
import { motion } from "framer-motion";
import { Camera, Upload } from "lucide-react";
import { useRef } from "react";

interface Props {
  onFileSelected: (file: File) => void;
  delay?: number;
}

export default function CardUploadPromptInline({ onFileSelected, delay = 0 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="w-full max-w-[88%] ml-10"
    >
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all px-4 py-4 flex items-center gap-3 active:scale-[0.98]"
      >
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
          <Camera className="w-5 h-5 text-primary" />
        </div>
        <div className="text-left flex-1">
          <span className="text-sm font-medium text-foreground">Envoyer une photo</span>
          <p className="text-[11px] text-muted-foreground mt-0.5">Prenez ou sélectionnez une photo pour l'analyse</p>
        </div>
        <Upload className="w-4 h-4 text-muted-foreground" />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />
    </motion.div>
  );
}

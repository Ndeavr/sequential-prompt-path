import { motion } from "framer-motion";
import { Camera, FileText, Upload } from "lucide-react";
import { useRef } from "react";

interface Props {
  type: "photo" | "quote";
  onFileSelected: (file: File) => void;
}

export default function WidgetUploadInline({ type, onFileSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isPhoto = type === "photo";

  const accept = isPhoto ? "image/*" : "image/*,.pdf,.doc,.docx";
  const Icon = isPhoto ? Camera : FileText;
  const label = isPhoto ? "Envoyer une photo" : "Envoyer une soumission";
  const hint = isPhoto ? "JPG, PNG — max 10 Mo" : "PDF, image — max 10 Mo";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-4"
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full flex flex-col items-center gap-2 group"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <Upload className="w-3.5 h-3.5" />
          {label}
        </div>
        <p className="text-[10px] text-muted-foreground">{hint}</p>
      </button>
    </motion.div>
  );
}

/**
 * CardPhotoUploadedPreview — Inline photo preview in chat with analysis state.
 */
import { motion } from "framer-motion";
import { Camera, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  previewUrl: string;
  status: "uploaded" | "processing" | "analyzed" | "failed";
  analysisSummary?: string;
  delay?: number;
}

export default function CardPhotoUploadedPreview({ previewUrl, status, analysisSummary, delay = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      className="flex justify-end"
    >
      <div className="max-w-[75%] rounded-xl overflow-hidden border border-border/30">
        {/* Image */}
        <div className="relative">
          <img
            src={previewUrl}
            alt="Photo envoyée"
            className="w-full aspect-[4/3] object-cover"
          />
          {/* Status overlay */}
          {status === "processing" && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/80 border border-border/40">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground">Analyse en cours…</span>
              </div>
            </div>
          )}
          {status === "analyzed" && (
            <div className="absolute top-2 right-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-emerald-400 font-medium">Analysé</span>
              </div>
            </div>
          )}
        </div>

        {/* Badge */}
        <div className="px-3 py-2 bg-card/80 border-t border-border/20 flex items-center gap-2">
          <Camera className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] text-muted-foreground">
            {status === "uploaded" && "Photo envoyée"}
            {status === "processing" && "Analyse en cours…"}
            {status === "analyzed" && (analysisSummary || "Analyse terminée")}
            {status === "failed" && "Erreur d'analyse"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

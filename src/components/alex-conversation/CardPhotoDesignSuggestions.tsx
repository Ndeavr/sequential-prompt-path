import { motion } from "framer-motion";
import { Palette, Sparkles } from "lucide-react";
import type { PhotoDesignData } from "./types";

interface Props {
  data: PhotoDesignData;
}

export default function CardPhotoDesignSuggestions({ data }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">Analyse design</p>
          <p className="text-sm font-semibold text-foreground">{data.roomType} · {data.detectedStyle}</p>
        </div>
      </div>

      <div className="space-y-2">
        {data.suggestions.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className="flex items-start gap-2.5 bg-muted/40 rounded-lg p-2.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">{s.style}</p>
                <span className="text-[10px] text-muted-foreground">{Math.round(s.confidence * 100)}%</span>
              </div>
              <p className="text-xs text-foreground/70 mt-0.5">{s.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

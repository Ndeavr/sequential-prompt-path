/**
 * PanelAlexInlineImageGallery — Scrollable image gallery inline in chat.
 */
import { motion } from "framer-motion";
import { Images } from "lucide-react";
import type { ImageGalleryData } from "./types";

interface Props {
  data: ImageGalleryData;
  onImageClick?: (url: string) => void;
}

export default function PanelAlexInlineImageGallery({ data, onImageClick }: Props) {
  return (
    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3">
      {data.title && (
        <div className="flex items-center gap-2">
          <Images className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">{data.title}</h4>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {data.images.map((img, i) => (
          <button
            key={i}
            onClick={() => onImageClick?.(img.url)}
            className="shrink-0 rounded-xl overflow-hidden border border-border/30 hover:border-primary/30 transition-all w-28 aspect-square bg-muted"
          >
            <img src={img.url} alt={img.label || `Image ${i + 1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {data.images.some(img => img.label) && (
        <div className="flex gap-1.5 flex-wrap">
          {data.images.filter(img => img.label).map((img, i) => (
            <span key={i} className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
              {img.label}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

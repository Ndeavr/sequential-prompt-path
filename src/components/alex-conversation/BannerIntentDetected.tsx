/**
 * BannerIntentDetected — Shows detected intent + location as a subtle banner in Alex.
 */
import { motion } from "framer-motion";
import { Sparkles, MapPin } from "lucide-react";

interface BannerIntentDetectedProps {
  intentLabel?: string | null;
  city?: string | null;
}

export default function BannerIntentDetected({ intentLabel, city }: BannerIntentDetectedProps) {
  if (!intentLabel && !city) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center gap-3 py-2 px-4"
    >
      {intentLabel && (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
          <Sparkles className="h-3 w-3" />
          {intentLabel}
        </span>
      )}
      {city && (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/40 px-3 py-1 rounded-full">
          <MapPin className="h-3 w-3" />
          {city}
        </span>
      )}
    </motion.div>
  );
}

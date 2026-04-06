/**
 * CardBusinessIdentityRealtime — Reveals business identity progressively.
 */
import { motion } from "framer-motion";
import { Building2, MapPin, Globe, Phone } from "lucide-react";
import type { ImportData } from "@/hooks/useTerminalImportAnimation";

interface Props {
  data: ImportData;
  revealed: boolean;
}

export default function CardBusinessIdentityRealtime({ data, revealed }: Props) {
  if (!revealed) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-emerald-500/15 p-4 space-y-3"
      style={{ background: "linear-gradient(135deg, hsl(160 20% 6%) 0%, hsl(160 30% 4%) 100%)" }}
    >
      <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
        <Building2 className="w-4 h-4" /> Identité détectée
      </h3>
      <div className="space-y-1.5 text-xs font-mono">
        {data.businessName && (
          <div className="flex items-center gap-2 text-foreground/90">
            <span className="text-emerald-500/50 w-16">nom</span>
            <span className="text-emerald-200 font-semibold">{data.businessName}</span>
          </div>
        )}
        {data.category && (
          <div className="flex items-center gap-2 text-foreground/70">
            <span className="text-emerald-500/50 w-16">catégorie</span>
            <span>{data.category}</span>
          </div>
        )}
        {data.city && (
          <div className="flex items-center gap-2 text-foreground/70">
            <MapPin className="w-3 h-3 text-emerald-500/50" />
            <span>{data.city}</span>
          </div>
        )}
        {data.website && (
          <div className="flex items-center gap-2 text-foreground/70">
            <Globe className="w-3 h-3 text-emerald-500/50" />
            <span className="truncate">{data.website}</span>
          </div>
        )}
        {data.phone && (
          <div className="flex items-center gap-2 text-foreground/70">
            <Phone className="w-3 h-3 text-emerald-500/50" />
            <span>{data.phone}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

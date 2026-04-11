import { motion } from "framer-motion";
import { CreditCard, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ImportPhase } from "@/hooks/useBusinessCardImport";

interface Props {
  phase: ImportPhase;
  companyName?: string;
  fieldsCount: number;
  confidence: number;
  onStart: () => void;
  onCreateProfile: () => void;
}

export default function CardBusinessCardImport({ phase, companyName, fieldsCount, confidence, onStart, onCreateProfile }: Props) {
  if (phase === "done") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 text-center space-y-3"
      >
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
        <h3 className="text-lg font-bold text-foreground">
          {companyName || "Entrepreneur"} importé !
        </h3>
        <p className="text-sm text-muted-foreground">
          {fieldsCount} champs extraits · Confiance {Math.round(confidence)}%
        </p>
      </motion.div>
    );
  }

  if (phase === "extracted") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl border border-primary/30 bg-primary/5"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {companyName || "Entreprise détectée"}
            </p>
            <p className="text-xs text-muted-foreground">{fieldsCount} champs · {Math.round(confidence)}% confiance</p>
          </div>
          <Button size="sm" onClick={onCreateProfile} className="gap-1.5">
            Créer le profil <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return null;
}

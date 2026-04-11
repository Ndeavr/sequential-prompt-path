import { motion } from "framer-motion";
import { Brain, FolderOpen, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface Props {
  detectedIntent?: "comparison" | "record" | "ambiguous";
  onSelect?: (type: "comparison" | "record") => void;
}

export default function PanelAlexGuidedQuoteIntent({ detectedIntent = "ambiguous", onSelect }: Props) {
  if (detectedIntent === "comparison") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Analyse comparative détectée</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Je vais vous guider vers l'analyse comparative de vos soumissions.
        </p>
        <Button asChild size="sm" className="rounded-xl gap-2">
          <Link to="/analyse-soumissions/importer">Analyser jusqu'à 3 soumissions</Link>
        </Button>
      </motion.div>
    );
  }

  if (detectedIntent === "record") {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-amber-600" />
          <p className="text-sm font-semibold text-foreground">Ajout au dossier détecté</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Je vais vous guider vers l'ajout d'une soumission au dossier client.
        </p>
        <Button asChild size="sm" variant="outline" className="rounded-xl gap-2">
          <Link to="/dossier-soumissions/ajouter">Ajouter une soumission au dossier</Link>
        </Button>
      </motion.div>
    );
  }

  // Ambiguous
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Que souhaitez-vous faire?</p>
      </div>
      <div className="space-y-2">
        <Button onClick={() => onSelect?.("comparison")} variant="outline" size="sm" className="w-full justify-start gap-2 rounded-xl">
          <Brain className="h-3.5 w-3.5 text-primary" /> Analyser jusqu'à 3 soumissions
        </Button>
        <Button onClick={() => onSelect?.("record")} variant="outline" size="sm" className="w-full justify-start gap-2 rounded-xl">
          <FolderOpen className="h-3.5 w-3.5 text-amber-600" /> Ajouter une soumission au dossier
        </Button>
      </div>
    </motion.div>
  );
}

import { Brain, FolderOpen, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function PanelDifferenceSoumissionTypes() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-4"
    >
      <h3 className="text-sm font-semibold text-foreground">Deux usages distincts</h3>

      <div className="grid gap-3">
        <div className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/10 p-3">
          <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground">Analyse comparative IA</p>
            <p className="text-[11px] text-muted-foreground">
              Importez 1 à 3 soumissions reçues pour comparer les prix, garanties et risques. 
              Résultat : un rapport IA avec recommandation.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground font-medium px-3 py-1 rounded-full bg-muted/50">≠</span>
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-amber-500/5 border border-amber-500/10 p-3">
          <FolderOpen className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground">Soumission au dossier client</p>
            <p className="text-[11px] text-muted-foreground">
              Ajoutez une soumission structurée au dossier d'une propriété. 
              Pour le suivi documentaire, l'historique et la traçabilité.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

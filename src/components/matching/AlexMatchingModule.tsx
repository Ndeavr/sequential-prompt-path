/**
 * UNPRO — Alex Matching Assistant Module
 * Decision copilot embedded in matching results.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ChevronDown, ChevronUp, Shield, Home, DollarSign, MessageCircle } from "lucide-react";

interface AlexMatchingModuleProps {
  projectType?: string;
  matchCount: number;
  topScore?: number;
  onFilter?: (filter: string) => void;
}

const quickActions = [
  { id: "safer", icon: Shield, label: "Options plus sûres", label_en: "Safer options", filter: "safe" },
  { id: "occupied", icon: Home, label: "Maison occupée", label_en: "Occupied home", filter: "occupied" },
  { id: "budget", icon: DollarSign, label: "Budget serré", label_en: "Tighter budget", filter: "budget" },
  { id: "communication", icon: MessageCircle, label: "Meilleure communication", label_en: "Best communication", filter: "communication" },
];

const AlexMatchingModule = ({ projectType, matchCount, topScore, onFilter }: AlexMatchingModuleProps) => {
  const [expanded, setExpanded] = useState(false);

  const getMessage = () => {
    if (matchCount === 0) return "Je n'ai pas encore de résultats pour ce projet. Complétez votre profil pour de meilleures recommandations.";
    if (topScore && topScore >= 85)
      return `J'ai trouvé ${matchCount} entrepreneurs compatibles. Votre meilleur match a un score de ${Math.round(topScore)} — c'est un excellent alignement!`;
    if (topScore && topScore >= 65)
      return `${matchCount} entrepreneurs analysés. Bon potentiel, mais je recommande de comparer les profils attentivement.`;
    return `${matchCount} entrepreneurs évalués. Les scores sont modérés — considérez élargir vos critères.`;
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-secondary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display text-sm font-semibold">Alex</h3>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/20 text-primary">
                Copilote décision
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              {getMessage()}
            </p>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] gap-1 px-2"
                  onClick={() => onFilter?.(action.filter)}
                >
                  <action.icon className="w-3 h-3" />
                  {action.label}
                </Button>
              ))}
            </div>

            {/* Expandable Tips */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              {expanded ? "Masquer les conseils" : "Conseils de sélection"}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground space-y-1.5">
                    <p>• <strong>Score URS élevé</strong> = meilleur alignement global avec votre projet</p>
                    <p>• <strong>CCAI</strong> = compatibilité de style de travail et communication</p>
                    <p>• <strong>Probabilité de succès</strong> intègre fiabilité, budget et complexité</p>
                    <p>• Comparez toujours au moins 2 profils avant de décider</p>
                    <p>• Les signaux de risque ne sont pas rédhibitoires — ils indiquent des points à surveiller</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlexMatchingModule;

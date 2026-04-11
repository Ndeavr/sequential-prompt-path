import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onSelectHomeowner?: () => void;
  onSelectEntrepreneur?: () => void;
}

export default function PanelAlexClarificationRequired({ onSelectHomeowner, onSelectEntrepreneur }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">Clarification</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Cherchez-vous un entrepreneur pour votre propriété, ou souhaitez-vous choisir un plan pour votre entreprise ?
      </p>
      <div className="space-y-2">
        <Button
          onClick={onSelectHomeowner}
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 rounded-xl"
        >
          🏠 Trouver un entrepreneur pour ma propriété
        </Button>
        <Button
          onClick={onSelectEntrepreneur}
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 rounded-xl"
        >
          🏢 Choisir un plan pour mon entreprise
        </Button>
      </div>
    </motion.div>
  );
}

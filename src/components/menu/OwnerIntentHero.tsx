/**
 * UNPRO — Homeowner intent step: "What would you like to do?"
 */
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { HOMEOWNER_INTENTS } from "@/data/menuTaxonomy";

interface OwnerIntentHeroProps {
  selected: string;
  onSelect: (value: string) => void;
}

export default function OwnerIntentHero({ selected, onSelect }: OwnerIntentHeroProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Que souhaitez-vous faire ?</h2>
        <p className="text-sm text-muted-foreground mt-1">Choisissez ce qui correspond le mieux à votre besoin</p>
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        {HOMEOWNER_INTENTS.map((intent, i) => {
          const Icon = intent.icon;
          const isSelected = selected === intent.value;
          return (
            <motion.button
              key={intent.value}
              type="button"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => onSelect(intent.value)}
              className={`flex items-center gap-3 rounded-xl p-3.5 text-left transition-all border ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${
                isSelected ? "bg-primary/10" : "bg-muted/50"
              }`}>
                <Icon className={`h-4.5 w-4.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                  {intent.label}
                </div>
                <div className="text-xs text-muted-foreground">{intent.description}</div>
              </div>
              {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

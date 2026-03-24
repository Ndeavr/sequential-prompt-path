import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Shield, Eye, TrendingUp, Calendar, Swords, Crown, Rocket, Check
} from "lucide-react";
import { cn } from "@/lib/utils";

const OBJECTIVES = [
  { key: "maintain", label: "Maintenir mes revenus", icon: Shield, color: "from-primary/20 to-primary/5" },
  { key: "visibility", label: "Améliorer ma visibilité", icon: Eye, color: "from-accent/20 to-accent/5" },
  { key: "profit", label: "Augmenter mes profits", icon: TrendingUp, color: "from-green-500/20 to-green-500/5" },
  { key: "appointments", label: "Plus de rendez-vous", icon: Calendar, color: "from-secondary/20 to-secondary/5" },
  { key: "compete", label: "Battre mes compétiteurs", icon: Swords, color: "from-orange-500/20 to-orange-500/5" },
  { key: "dominate", label: "Dominer ma ville", icon: Crown, color: "from-yellow-500/20 to-yellow-500/5" },
  { key: "growth", label: "Croissance rapide", icon: Rocket, color: "from-rose-500/20 to-rose-500/5" },
];

interface Props {
  primary: string;
  secondary: string[];
  onPrimaryChange: (key: string) => void;
  onSecondaryChange: (keys: string[]) => void;
}

export default function ObjectiveSelectorGrid({ primary, secondary, onPrimaryChange, onSecondaryChange }: Props) {
  const toggleSecondary = (key: string) => {
    if (key === primary) return;
    if (secondary.includes(key)) {
      onSecondaryChange(secondary.filter(s => s !== key));
    } else if (secondary.length < 2) {
      onSecondaryChange([...secondary, key]);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Choisissez <span className="text-foreground font-semibold">1 objectif principal</span> puis jusqu'à <span className="text-foreground font-semibold">2 secondaires</span>
      </p>
      <div className="grid grid-cols-1 gap-3">
        {OBJECTIVES.map((obj, i) => {
          const isPrimary = primary === obj.key;
          const isSecondary = secondary.includes(obj.key);
          const isSelected = isPrimary || isSecondary;

          return (
            <motion.button
              key={obj.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => {
                if (isPrimary) {
                  onPrimaryChange("");
                } else if (isSecondary) {
                  onSecondaryChange(secondary.filter(s => s !== obj.key));
                } else if (!primary) {
                  onPrimaryChange(obj.key);
                } else {
                  toggleSecondary(obj.key);
                }
              }}
              className={cn(
                "relative flex items-center gap-3 p-4 rounded-2xl border transition-all text-left",
                isPrimary && "border-primary bg-primary/10 ring-2 ring-primary/30",
                isSecondary && "border-secondary/50 bg-secondary/5",
                !isSelected && "border-border/50 bg-card hover:border-primary/30 hover:bg-primary/5"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shrink-0",
                obj.color
              )}>
                <obj.icon className={cn("w-5 h-5", isPrimary ? "text-primary" : "text-muted-foreground")} />
              </div>
              <span className="font-medium text-sm flex-1">{obj.label}</span>
              {isPrimary && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Principal
                </span>
              )}
              {isSecondary && (
                <Check className="w-4 h-4 text-secondary" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

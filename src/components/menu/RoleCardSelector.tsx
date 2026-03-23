/**
 * UNPRO — 4 clear role cards for signup/onboarding
 */
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { ROLE_CARDS } from "@/data/menuTaxonomy";

interface RoleCardSelectorProps {
  selected: string;
  onSelect: (value: string) => void;
}

export default function RoleCardSelector({ selected, onSelect }: RoleCardSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {ROLE_CARDS.map((role, i) => {
        const Icon = role.icon;
        const isSelected = selected === role.value;
        return (
          <motion.button
            key={role.value}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(role.value)}
            className={`relative flex flex-col items-start gap-2 rounded-xl p-4 text-left transition-all duration-200 cursor-pointer border-2 ${
              isSelected
                ? "border-primary bg-primary/5 shadow-lg ring-2 ring-primary/10"
                : "border-border bg-card hover:border-primary/30 hover:bg-muted/30"
            }`}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <Icon className={`h-5 w-5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                {role.label}
              </span>
            </div>
            <span className="text-xs text-muted-foreground leading-snug">{role.description}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

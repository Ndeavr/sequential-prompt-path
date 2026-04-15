/**
 * GridPainSelectionInteractive — Clickable pain cards that trigger UI mutation.
 */
import { motion } from "framer-motion";
import { type PainOption } from "@/hooks/useAdaptiveSession";
import { cn } from "@/lib/utils";
import {
  Thermometer, Droplets, DollarSign, Clock, Wrench,
  ShieldAlert, HelpCircle, Building2, FileWarning, Zap,
  TrendingDown, Search, Users, Megaphone, Star,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  thermometer: Thermometer,
  droplets: Droplets,
  dollar: DollarSign,
  clock: Clock,
  wrench: Wrench,
  shield: ShieldAlert,
  help: HelpCircle,
  building: Building2,
  file: FileWarning,
  zap: Zap,
  trending: TrendingDown,
  search: Search,
  users: Users,
  megaphone: Megaphone,
  star: Star,
};

interface Props {
  pains: PainOption[];
  selectedId: string | null;
  onSelect: (pain: PainOption) => void;
}

export default function GridPainSelectionInteractive({ pains, selectedId, onSelect }: Props) {
  return (
    <section className="px-5 py-6">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 text-center">
        Quel est votre plus gros irritant?
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
        {pains.map((pain, i) => {
          const Icon = ICON_MAP[pain.icon] ?? HelpCircle;
          const isSelected = pain.id === selectedId;

          return (
            <motion.button
              key={pain.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25 }}
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.03 }}
              onClick={() => onSelect(pain)}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all duration-200",
                "bg-card/60 backdrop-blur-sm text-foreground",
                isSelected
                  ? "border-primary/50 bg-primary/[0.06] shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
                  : "border-border/40 hover:border-primary/30 hover:bg-primary/[0.03]",
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                isSelected ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground",
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-center leading-tight">{pain.label}</span>

              {isSelected && (
                <motion.div
                  layoutId="pain-glow"
                  className="absolute inset-0 rounded-2xl border-2 border-primary/30 pointer-events-none"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

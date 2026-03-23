/**
 * UNPRO — Seasonal & Upcoming suggestions chips
 */
import { motion } from "framer-motion";
import { Sparkles, Clock } from "lucide-react";
import { getActiveItems, getUpcomingItems, type MenuItemDef } from "@/data/menuTaxonomy";

interface SeasonalSuggestionsBarProps {
  onItemClick?: (item: MenuItemDef) => void;
}

export default function SeasonalSuggestionsBar({ onItemClick }: SeasonalSuggestionsBarProps) {
  const currentMonth = new Date().getMonth() + 1;
  const activeNow = getActiveItems(currentMonth);
  const upcoming = getUpcomingItems(currentMonth);

  if (activeNow.length === 0 && upcoming.length === 0) return null;

  return (
    <div className="space-y-3">
      {activeNow.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Recommandé maintenant</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeNow.map((item) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.slug}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => onItemClick?.(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <Icon className="h-3 w-3" />
                  {item.name}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">À venir bientôt</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {upcoming.map((item) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.slug}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => onItemClick?.(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-200 bg-amber-50 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  <Icon className="h-3 w-3" />
                  {item.name}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

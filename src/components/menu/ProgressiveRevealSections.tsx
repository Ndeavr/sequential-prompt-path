/**
 * UNPRO — Progressive reveal of homeowner service universe
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { HOMEOWNER_SECTIONS, type MenuSectionDef, type MenuItemDef } from "@/data/menuTaxonomy";

interface ProgressiveRevealSectionsProps {
  onItemClick?: (item: MenuItemDef, section: MenuSectionDef) => void;
  initialVisibleCount?: number;
}

export default function ProgressiveRevealSections({ onItemClick, initialVisibleCount = 3 }: ProgressiveRevealSectionsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  const visibleSections = showAll ? HOMEOWNER_SECTIONS : HOMEOWNER_SECTIONS.slice(0, initialVisibleCount);
  const hiddenCount = HOMEOWNER_SECTIONS.length - initialVisibleCount;

  const toggleSection = (slug: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {visibleSections.map((section, si) => {
        const Icon = section.icon;
        const isExpanded = expandedSections.has(section.slug);
        const visibleItems = isExpanded ? section.items : section.items.slice(0, 4);

        return (
          <motion.div
            key={section.slug}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.05 }}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            {/* Section header */}
            <button
              type="button"
              onClick={() => toggleSection(section.slug)}
              className="flex items-center gap-3 w-full p-3.5 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50 shrink-0">
                <Icon className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">{section.name}</div>
                <div className="text-xs text-muted-foreground">{section.items.length} services</div>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>

            {/* Items */}
            <AnimatePresence>
              <div className="px-3 pb-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {visibleItems.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <motion.button
                        key={item.slug}
                        type="button"
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => onItemClick?.(item, section)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-muted/40 transition-colors"
                      >
                        <ItemIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs text-foreground truncate">{item.name}</span>
                        {item.isPopular && (
                          <span className="ml-auto text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                            Top
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
                {!isExpanded && section.items.length > 4 && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.slug)}
                    className="text-xs text-primary hover:underline mt-1.5 ml-2.5"
                  >
                    +{section.items.length - 4} autres services
                  </button>
                )}
              </div>
            </AnimatePresence>
          </motion.div>
        );
      })}

      {!showAll && hiddenCount > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
        >
          Voir {hiddenCount} autres catégories
        </motion.button>
      )}
    </div>
  );
}

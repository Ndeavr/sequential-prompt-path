/**
 * UNPRO — Category Selector Component
 * Intelligent category picker with primary/secondary distinction,
 * plan-based limits, admin approval badges, and duplicate prevention.
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, ChevronRight, CheckCircle2, Shield, Lock, Star, AlertTriangle, Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useServiceCategories, ServiceCategory } from "@/hooks/useServiceCategories";

export interface CategorySelection {
  primaryId: string | null;
  secondaryIds: string[];
}

interface CategorySelectorProps {
  selection: CategorySelection;
  onSelectionChange: (sel: CategorySelection) => void;
  maxSecondary: number;
  planName?: string;
}

export default function CategorySelector({
  selection, onSelectionChange, maxSecondary, planName,
}: CategorySelectorProps) {
  const { data: cats, isLoading } = useServiceCategories();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (!cats) return [];
    if (!searchQuery.trim()) return cats.roots;

    const q = searchQuery.toLowerCase();
    return cats.roots
      .map((root) => ({
        ...root,
        children: (root.children || []).filter(
          (c) =>
            c.name_fr.toLowerCase().includes(q) ||
            (c.ai_keywords || []).some((k) => k.includes(q))
        ),
      }))
      .filter(
        (root) =>
          root.name_fr.toLowerCase().includes(q) ||
          (root.ai_keywords || []).some((k) => k.includes(q)) ||
          root.children.length > 0
      );
  }, [cats, searchQuery]);

  const isPrimary = (id: string) => selection.primaryId === id;
  const isSecondary = (id: string) => selection.secondaryIds.includes(id);
  const isSelected = (id: string) => isPrimary(id) || isSecondary(id);

  const handleSelect = (cat: ServiceCategory, asPrimary: boolean) => {
    if (asPrimary) {
      // Set as primary, remove from secondary if was there
      const newSecondary = selection.secondaryIds.filter((id) => id !== cat.id);
      onSelectionChange({ primaryId: cat.id, secondaryIds: newSecondary });
    } else {
      if (isSecondary(cat.id)) {
        // Remove secondary
        onSelectionChange({
          ...selection,
          secondaryIds: selection.secondaryIds.filter((id) => id !== cat.id),
        });
      } else if (isPrimary(cat.id)) {
        // Can't add primary as secondary
        return;
      } else if (selection.secondaryIds.length < maxSecondary) {
        onSelectionChange({
          ...selection,
          secondaryIds: [...selection.secondaryIds, cat.id],
        });
      }
    }
  };

  const getCategoryName = (id: string): string => {
    if (!cats) return "";
    const found = cats.all.find((c) => c.id === id);
    return found?.name_fr || "";
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-muted rounded-lg" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Current selection summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              {selection.primaryId ? getCategoryName(selection.primaryId) : "Aucune catégorie principale"}
            </span>
            {selection.primaryId && <Badge variant="default" className="text-[10px] h-4">Principale</Badge>}
          </div>
          {selection.secondaryIds.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selection.secondaryIds.map((id) => (
                <Badge key={id} variant="secondary" className="text-[10px] cursor-pointer" onClick={() => handleSelect({ id } as ServiceCategory, false)}>
                  {getCategoryName(id)} ×
                </Badge>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">
            {selection.secondaryIds.length}/{maxSecondary} catégories secondaires
            {planName && <span className="ml-1">(plan {planName})</span>}
          </p>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une catégorie…"
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Category tree */}
      <div className="space-y-1.5">
        {filtered.map((root) => {
          const isExpanded = expandedId === root.id || !!searchQuery;
          const hasChildren = (root.children || []).length > 0;
          const rootSelected = isSelected(root.id);

          return (
            <div key={root.id} className="space-y-1">
              {/* Root category */}
              <div
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                  rootSelected
                    ? "bg-primary/10 border-primary"
                    : "bg-card border-border hover:border-primary/40"
                }`}
                onClick={() => hasChildren ? setExpandedId(isExpanded ? null : root.id) : handleSelect(root, !selection.primaryId)}
              >
                {hasChildren ? (
                  isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <div className="w-4" />
                )}

                <span className="text-sm font-medium text-foreground flex-1">{root.name_fr}</span>

                {root.requires_admin_approval && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-warning/40 text-warning">
                    <Shield className="w-2.5 h-2.5 mr-0.5" /> Admin
                  </Badge>
                )}

                {rootSelected && (
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                )}

                {!rootSelected && !hasChildren && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-2"
                    onClick={(e) => { e.stopPropagation(); handleSelect(root, !selection.primaryId); }}
                  >
                    Sélectionner
                  </Button>
                )}
              </div>

              {/* Subcategories */}
              <AnimatePresence>
                {isExpanded && hasChildren && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pl-4 space-y-1"
                  >
                    {(root.children || []).map((sub) => {
                      const subSelected = isSelected(sub.id);
                      const subIsPrimary = isPrimary(sub.id);
                      const atLimit = !subSelected && selection.secondaryIds.length >= maxSecondary && !!selection.primaryId;

                      return (
                        <div
                          key={sub.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                            subSelected
                              ? subIsPrimary
                                ? "bg-primary/15 border-primary font-medium"
                                : "bg-accent/30 border-accent/50"
                              : atLimit
                              ? "bg-muted/50 border-border opacity-50 cursor-not-allowed"
                              : "bg-card border-border hover:border-primary/30 cursor-pointer"
                          }`}
                          onClick={() => {
                            if (atLimit && !subSelected) return;
                            if (subIsPrimary) return; // can't deselect primary here
                            handleSelect(sub, false);
                          }}
                        >
                          <span className="flex-1 text-foreground">{sub.name_fr}</span>

                          {sub.requires_admin_approval && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-warning/40 text-warning">
                              <Shield className="w-2.5 h-2.5" />
                            </Badge>
                          )}

                          {subIsPrimary && (
                            <Badge variant="default" className="text-[9px] h-4">★ Principale</Badge>
                          )}

                          {isSecondary(sub.id) && (
                            <Badge variant="secondary" className="text-[9px] h-4">Secondaire</Badge>
                          )}

                          {atLimit && !subSelected && (
                            <Lock className="w-3 h-3 text-muted-foreground" />
                          )}

                          {/* Set as primary action */}
                          {subSelected && !subIsPrimary && (
                            <button
                              className="text-[9px] text-primary hover:underline shrink-0"
                              onClick={(e) => { e.stopPropagation(); handleSelect(sub, true); }}
                            >
                              ★ Principale
                            </button>
                          )}

                          {!subSelected && !atLimit && (
                            <button
                              className="text-[9px] text-primary hover:underline shrink-0"
                              onClick={(e) => { e.stopPropagation(); handleSelect(sub, !selection.primaryId); }}
                            >
                              {!selection.primaryId ? "★ Principale" : "+ Ajouter"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Plan upgrade hint */}
      {selection.secondaryIds.length >= maxSecondary && (
        <div className="flex items-start gap-2 bg-muted/40 rounded-lg p-3">
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground">
            Vous avez atteint la limite de {maxSecondary} catégories secondaires pour votre plan.
            Passez au plan supérieur pour en ajouter davantage.
          </p>
        </div>
      )}
    </div>
  );
}

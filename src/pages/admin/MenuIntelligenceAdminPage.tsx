/**
 * UNPRO — Admin Menu Editor (lightweight)
 * Allows reordering, toggling, and previewing menu sections/items.
 */
import { useState } from "react";
import MainLayout from "@/layouts/MainLayout";
import { HOMEOWNER_SECTIONS, type MenuSectionDef } from "@/data/menuTaxonomy";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { GripVertical, Eye, Settings, ChevronDown, ChevronUp } from "lucide-react";

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

export default function MenuIntelligenceAdminPage() {
  const [sections, setSections] = useState<MenuSectionDef[]>([...HOMEOWNER_SECTIONS]);
  const [previewMonth, setPreviewMonth] = useState(String(new Date().getMonth() + 1));
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [disabledItems, setDisabledItems] = useState<Set<string>>(new Set());

  const toggleItem = (slug: string) => {
    setDisabledItems(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug); else next.add(slug);
      return next;
    });
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...sections];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newSections.length) return;
    [newSections[index], newSections[swapIndex]] = [newSections[swapIndex], newSections[index]];
    setSections(newSections);
  };

  const month = parseInt(previewMonth);

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Settings className="h-5 w-5" /> Menu Intelligence
              </h1>
              <p className="text-sm text-muted-foreground">Gérer les sections, services et règles saisonnières</p>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Select value={previewMonth} onValueChange={setPreviewMonth}>
                <SelectTrigger className="w-28 h-8 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-2">
            {sections.map((section, si) => {
              const Icon = section.icon;
              const isExpanded = expandedSection === section.slug;
              return (
                <motion.div key={section.slug} layout className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center gap-2 p-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 cursor-grab" />
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveSection(si, "up")} disabled={si === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-20">
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button type="button" onClick={() => moveSection(si, "down")} disabled={si === sections.length - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-20">
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    <Icon className="h-4 w-4 text-foreground shrink-0" />
                    <span className="text-sm font-semibold text-foreground flex-1">{section.name}</span>
                    <span className="text-xs text-muted-foreground">{section.items.length} items</span>
                    <button type="button" onClick={() => setExpandedSection(isExpanded ? null : section.slug)} className="text-xs text-primary hover:underline">
                      {isExpanded ? "Fermer" : "Modifier"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border px-3 pb-3 pt-2 space-y-1">
                      {section.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isDisabled = disabledItems.has(item.slug);
                        const isSeasonalActive = !item.isSeasonal || item.activeMonths?.includes(month);
                        const isUpcoming = item.isSeasonal && item.upcomingMonths?.includes(month);

                        return (
                          <div key={item.slug} className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg ${isDisabled ? "opacity-40" : ""}`}>
                            <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                            <ItemIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-foreground flex-1">{item.name}</span>
                            {item.isSeasonal && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                                isSeasonalActive ? "bg-green-100 text-green-700" : isUpcoming ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"
                              }`}>
                                {isSeasonalActive ? "Actif" : isUpcoming ? "Bientôt" : "Hors saison"}
                              </span>
                            )}
                            {item.isPopular && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Populaire</span>
                            )}
                            <Switch checked={!isDisabled} onCheckedChange={() => toggleItem(item.slug)} className="scale-75" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Save */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="rounded-lg text-xs">Annuler</Button>
            <Button size="sm" className="rounded-lg text-xs">Sauvegarder</Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

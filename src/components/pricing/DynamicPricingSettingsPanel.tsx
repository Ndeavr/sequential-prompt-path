/**
 * UNPRO — Dynamic Pricing Settings Panel (Admin)
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Save } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useDynamicPricingSettings, useUpdatePricingSetting } from "@/hooks/useDynamicPricing";

const SETTING_LABELS: Record<string, { label: string; description: string; type: "boolean" | "number" }> = {
  dynamic_pricing_enabled: { label: "Tarification dynamique", description: "Activer le pricing dynamique global", type: "boolean" },
  max_combined_multiplier: { label: "Multiplicateur max", description: "Plafond du multiplicateur combiné", type: "number" },
  storm_pricing_enabled: { label: "Pricing tempête", description: "Activer le pricing majoré en mode tempête", type: "boolean" },
  after_hours_multiplier: { label: "Mult. hors heures", description: "Multiplicateur après 18h", type: "number" },
  overnight_multiplier: { label: "Mult. nuit", description: "Multiplicateur entre 22h et 6h", type: "number" },
  weekend_multiplier: { label: "Mult. fin de semaine", description: "Multiplicateur samedi/dimanche", type: "number" },
  surge_auto_detect: { label: "Détection surge auto", description: "Détecter automatiquement les surges", type: "boolean" },
  min_acceptance_rate_threshold: { label: "Seuil acceptance min", description: "Réduire le prix si < ce seuil (%)", type: "number" },
  price_floor_cents: { label: "Prix plancher (¢)", description: "Prix minimum en cents", type: "number" },
  price_ceiling_cents: { label: "Prix plafond (¢)", description: "Prix maximum en cents", type: "number" },
};

export default function DynamicPricingSettingsPanel() {
  const { data: settings, isLoading } = useDynamicPricingSettings();
  const updateMut = useUpdatePricingSetting();
  const [edits, setEdits] = useState<Record<string, any>>({});

  const getValue = (key: string) => {
    if (key in edits) return edits[key];
    const s = settings?.find((s: any) => s.setting_key === key);
    return s?.setting_value ?? null;
  };

  const handleSave = (id: string, key: string) => {
    if (!(key in edits)) return;
    updateMut.mutate({ id, value: edits[key] });
    setEdits((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  if (isLoading) return <p className="text-xs text-muted-foreground p-4">Chargement…</p>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
    >
      <div className="flex items-center gap-2 mb-5">
        <Settings className="w-4 h-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">Paramètres dynamiques</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(settings ?? []).map((s: any) => {
          const meta = SETTING_LABELS[s.setting_key];
          if (!meta) return null;
          const val = getValue(s.setting_key);
          const isDirty = s.setting_key in edits;

          return (
            <div key={s.id} className="rounded-xl bg-muted/10 border border-border/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">{meta.label}</p>
                  <p className="text-[10px] text-muted-foreground">{meta.description}</p>
                </div>
                {isDirty && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[10px] text-primary"
                    onClick={() => handleSave(s.id, s.setting_key)}
                    disabled={updateMut.isPending}
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Sauver
                  </Button>
                )}
              </div>

              {meta.type === "boolean" ? (
                <Switch
                  checked={val === true}
                  onCheckedChange={(checked) => setEdits((p) => ({ ...p, [s.setting_key]: checked }))}
                />
              ) : (
                <Input
                  type="number"
                  value={val ?? ""}
                  onChange={(e) => setEdits((p) => ({ ...p, [s.setting_key]: Number(e.target.value) }))}
                  className="h-8 text-xs bg-background/50 border-border/40"
                />
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

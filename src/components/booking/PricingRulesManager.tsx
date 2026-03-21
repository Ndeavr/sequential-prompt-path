/**
 * Contractor pricing rules manager — configure dynamic pricing overrides
 */
import { useState, useEffect } from "react";
import { Plus, Trash2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { type PricingRule } from "@/services/bookingRevenueEngine";

const RULE_TYPES = [
  { value: "multiplier", label: "Multiplicateur de prix" },
  { value: "surcharge_fixed", label: "Surcharge fixe (cents)" },
  { value: "discount_percent", label: "Rabais (%)" },
];

const RULE_KEYS = [
  { value: "urgency", label: "Urgence" },
  { value: "same_day", label: "Même jour" },
  { value: "weekend", label: "Fin de semaine" },
  { value: "evening", label: "Soirée" },
  { value: "distance_far", label: "Distance éloignée" },
  { value: "high_demand", label: "Forte demande" },
  { value: "complexity_high", label: "Haute complexité" },
  { value: "returning_client", label: "Client récurrent" },
  { value: "custom", label: "Personnalisé" },
];

export function PricingRulesManager() {
  const { session } = useAuth();
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data: c } = await supabase
        .from("contractors")
        .select("id")
        .eq("user_id", session.user.id)
        .single();
      if (!c) return;
      setContractorId(c.id);

      const { data } = await supabase
        .from("booking_pricing_rules")
        .select("*")
        .eq("contractor_id", c.id)
        .order("rule_type");
      setRules((data ?? []) as unknown as PricingRule[]);
    })();
  }, [session?.user?.id]);

  const addRule = () => {
    if (!contractorId) return;
    setRules((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        contractor_id: contractorId,
        rule_type: "multiplier",
        rule_key: "urgency",
        value: 1.25,
        description_fr: "Urgence (+25%)",
        is_active: true,
      },
    ]);
  };

  const updateRule = (id: string, updates: Partial<PricingRule>) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSave = async () => {
    if (!contractorId) return;
    setSaving(true);
    try {
      await supabase.from("booking_pricing_rules").delete().eq("contractor_id", contractorId);

      if (rules.length > 0) {
        const inserts = rules.map((r) => ({
          contractor_id: contractorId,
          rule_type: r.rule_type,
          rule_key: r.rule_key,
          value: r.value,
          description_fr: r.description_fr,
          is_active: r.is_active,
        }));
        const { error } = await supabase.from("booking_pricing_rules").insert(inserts);
        if (error) throw error;
      }
      toast.success("Règles de tarification sauvegardées");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-primary" />
          <h3 className="text-body font-semibold text-foreground">Règles de tarification</h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addRule} className="gap-1.5 text-xs">
            <Plus className="w-3 h-3" />
            Ajouter
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">
            {saving ? "..." : "Sauvegarder"}
          </Button>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-xl border border-border/40 bg-muted/20 p-6 text-center">
          <p className="text-meta text-muted-foreground">
            Aucune règle personnalisée. Les tarifs par défaut s'appliquent.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Switch
                  checked={rule.is_active}
                  onCheckedChange={(v) => updateRule(rule.id, { is_active: v })}
                />
                <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => removeRule(rule.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Type</Label>
                  <Select value={rule.rule_type} onValueChange={(v) => updateRule(rule.id, { rule_type: v })}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RULE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Situation</Label>
                  <Select value={rule.rule_key} onValueChange={(v) => updateRule(rule.id, { rule_key: v })}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RULE_KEYS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Valeur</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, { value: Number(e.target.value) })}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">Description</Label>
                  <Input
                    value={rule.description_fr ?? ""}
                    onChange={(e) => updateRule(rule.id, { description_fr: e.target.value })}
                    className="h-9 text-xs"
                    placeholder="Ex: Urgence (+25%)"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

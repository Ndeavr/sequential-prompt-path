/**
 * FormCouponAdminCreate — Full admin form for creating coupons
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { X, Tag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreateCoupon } from "@/hooks/useCoupons";

const PLAN_OPTIONS = ["recrue", "pro", "premium", "elite", "signature"];
const INTERVAL_OPTIONS = [
  { value: "month", label: "Mensuel" },
  { value: "year", label: "Annuel" },
];

interface Props {
  onClose: () => void;
}

export default function FormCouponAdminCreate({ onClose }: Props) {
  const createCoupon = useCreateCoupon();

  const [form, setForm] = useState({
    code: "",
    label: "",
    description: "",
    description_public: "",
    discount_type: "percentage",
    discount_value: 0,
    currency: "cad",
    duration_type: "once",
    duration_in_months: 1,
    eligible_plan_codes: [] as string[],
    applies_to_billing_intervals: [] as string[],
    is_internal_only: false,
    is_partner_only: false,
    is_founder_offer: false,
    is_stackable: false,
    usage_limit_total: "",
    usage_limit_per_business: "",
    starts_at: "",
    ends_at: "",
    active: true,
    sync_stripe: true,
  });

  const update = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const togglePlan = (plan: string) => {
    const plans = form.eligible_plan_codes.includes(plan)
      ? form.eligible_plan_codes.filter((p) => p !== plan)
      : [...form.eligible_plan_codes, plan];
    update("eligible_plan_codes", plans);
  };

  const toggleInterval = (interval: string) => {
    const intervals = form.applies_to_billing_intervals.includes(interval)
      ? form.applies_to_billing_intervals.filter((i) => i !== interval)
      : [...form.applies_to_billing_intervals, interval];
    update("applies_to_billing_intervals", intervals);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCoupon.mutate(
      {
        ...form,
        usage_limit_total: form.usage_limit_total ? parseInt(form.usage_limit_total) : null,
        usage_limit_per_business: form.usage_limit_per_business ? parseInt(form.usage_limit_per_business) : null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Créer un coupon
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Code & Label */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => update("code", e.target.value.toUpperCase())}
                placeholder="UNPRO2026"
                className="font-mono uppercase"
                required
              />
            </div>
            <div>
              <Label>Nom interne</Label>
              <Input value={form.label} onChange={(e) => update("label", e.target.value)} placeholder="Offre fondateur Q1" />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>Description admin</Label>
            <Input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Usage interne uniquement" />
          </div>
          <div>
            <Label>Description publique</Label>
            <Input value={form.description_public} onChange={(e) => update("description_public", e.target.value)} placeholder="Rabais exclusif pour les premiers membres" />
          </div>

          {/* Discount type & value */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Type de réduction</Label>
              <Select value={form.discount_type} onValueChange={(v) => update("discount_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                  <SelectItem value="amount">Montant fixe ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valeur</Label>
              <Input
                type="number"
                value={form.discount_value}
                onChange={(e) => update("discount_value", parseFloat(e.target.value) || 0)}
                placeholder={form.discount_type === "percentage" ? "25" : "5000"}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {form.discount_type === "percentage" ? "En %" : "En cents (ex: 5000 = 50$)"}
              </p>
            </div>
            <div>
              <Label>Devise</Label>
              <Select value={form.currency} onValueChange={(v) => update("currency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cad">CAD</SelectItem>
                  <SelectItem value="usd">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Durée</Label>
              <Select value={form.duration_type} onValueChange={(v) => update("duration_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Une fois</SelectItem>
                  <SelectItem value="repeating">Récurrent (X mois)</SelectItem>
                  <SelectItem value="forever">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.duration_type === "repeating" && (
              <div>
                <Label>Nombre de mois</Label>
                <Input
                  type="number"
                  value={form.duration_in_months}
                  onChange={(e) => update("duration_in_months", parseInt(e.target.value) || 1)}
                  min={1}
                />
              </div>
            )}
          </div>

          {/* Plans */}
          <div>
            <Label>Plans éligibles</Label>
            <p className="text-xs text-muted-foreground mb-2">Laisser vide = tous les plans</p>
            <div className="flex gap-2 flex-wrap">
              {PLAN_OPTIONS.map((plan) => (
                <Button
                  key={plan}
                  type="button"
                  variant={form.eligible_plan_codes.includes(plan) ? "default" : "outline"}
                  size="sm"
                  onClick={() => togglePlan(plan)}
                  className="capitalize text-xs"
                >
                  {plan}
                </Button>
              ))}
            </div>
          </div>

          {/* Intervals */}
          <div>
            <Label>Intervalles de facturation</Label>
            <p className="text-xs text-muted-foreground mb-2">Laisser vide = tous</p>
            <div className="flex gap-2">
              {INTERVAL_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={form.applies_to_billing_intervals.includes(opt.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleInterval(opt.value)}
                  className="text-xs"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Limite totale d'utilisations</Label>
              <Input
                type="number"
                value={form.usage_limit_total}
                onChange={(e) => update("usage_limit_total", e.target.value)}
                placeholder="Illimité"
              />
            </div>
            <div>
              <Label>Limite par utilisateur</Label>
              <Input
                type="number"
                value={form.usage_limit_per_business}
                onChange={(e) => update("usage_limit_per_business", e.target.value)}
                placeholder="Illimité"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Date de début</Label>
              <Input type="datetime-local" value={form.starts_at} onChange={(e) => update("starts_at", e.target.value)} />
            </div>
            <div>
              <Label>Date de fin</Label>
              <Input type="datetime-local" value={form.ends_at} onChange={(e) => update("ends_at", e.target.value)} />
            </div>
          </div>

          {/* Flags */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "is_founder_offer", label: "Offre fondateur" },
              { key: "is_internal_only", label: "Usage interne" },
              { key: "is_partner_only", label: "Partenaire" },
              { key: "is_stackable", label: "Combinable" },
              { key: "active", label: "Actif" },
              { key: "sync_stripe", label: "Sync Stripe" },
            ].map((flag) => (
              <div key={flag.key} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <Label className="text-sm cursor-pointer">{flag.label}</Label>
                <Switch
                  checked={(form as any)[flag.key]}
                  onCheckedChange={(v) => update(flag.key, v)}
                />
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={createCoupon.isPending || !form.code} className="flex-1">
              {createCoupon.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Créer le coupon
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

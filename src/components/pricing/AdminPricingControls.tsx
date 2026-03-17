/**
 * UNPRO — Admin Pricing Controls
 * Override pricing, set floors/ceilings, adjust multipliers.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Zap, TrendingUp, Shield, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAppointmentPricing } from "@/hooks/useAppointmentPricing";
import { calculateAppointmentPrice, formatCents, PLAN_BASE_PRICES, PLAN_ACCESS, type PricingContext } from "@/services/appointmentPricingEngine";

export default function AdminPricingControls() {
  const { rules, surgeEvents, isLoading } = useAppointmentPricing(undefined);

  // Simulator state
  const [simCtx, setSimCtx] = useState<PricingContext>({
    planTier: "pro",
    estimatedProjectValueCents: 500000,
    citySlug: "montreal",
    tradeSlug: "plomberie",
    urgencyLevel: "medium",
    complexityLevel: "moderate",
    matchQualityScore: 75,
    demandCount: 8,
    supplyCount: 4,
  });

  const simResult = calculateAppointmentPrice(simCtx);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="font-display text-xl font-bold text-foreground">Moteur de tarification</h1>
          <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">Dynamique</span>
        </div>
        <p className="text-sm text-muted-foreground">Contrôlez les prix des rendez-vous exclusifs en temps réel</p>
      </div>

      {/* Active multiplier rules */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-4 h-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Multiplicateurs actifs</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rules.map((rule: any) => (
            <div key={rule.id} className="rounded-xl bg-muted/15 border border-border/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-foreground">{rule.label_fr}</p>
                <span className="text-[10px] text-muted-foreground/60">{rule.rule_category}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{rule.description_fr}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                <span>Min: {rule.min_value}</span>
                <span>·</span>
                <span>Base: <span className="text-foreground font-semibold">{rule.base_value}</span></span>
                <span>·</span>
                <span>Max: {rule.max_value}</span>
              </div>
            </div>
          ))}
          {rules.length === 0 && !isLoading && (
            <p className="text-xs text-muted-foreground col-span-full">Aucune règle configurée</p>
          )}
        </div>
      </motion.div>

      {/* Base price matrix */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Matrice des prix de base</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Plan</th>
                {(["S", "M", "L", "XL", "XXL"] as const).map(s => (
                  <th key={s} className="text-center py-2 px-3 text-muted-foreground font-medium">{s}</th>
                ))}
                <th className="text-center py-2 px-3 text-muted-foreground font-medium">Priorité</th>
                <th className="text-center py-2 px-3 text-muted-foreground font-medium">Auto</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(PLAN_BASE_PRICES).map(([plan, prices]) => (
                <tr key={plan} className="border-b border-border/10">
                  <td className="py-2.5 pr-4 font-medium text-foreground capitalize">{plan}</td>
                  {(["S", "M", "L", "XL", "XXL"] as const).map(s => (
                    <td key={s} className="text-center py-2.5 px-3 tabular-nums">
                      {prices[s] > 0 ? (
                        <span className="text-foreground">{formatCents(prices[s])}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  ))}
                  <td className="text-center py-2.5 px-3 tabular-nums text-primary font-semibold">
                    {PLAN_ACCESS[plan]?.priority ?? "—"}
                  </td>
                  <td className="text-center py-2.5 px-3">
                    {PLAN_ACCESS[plan]?.autoAccept ? (
                      <span className="text-success text-[10px] font-semibold">Oui</span>
                    ) : (
                      <span className="text-muted-foreground/50 text-[10px]">Non</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Active surges */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-500" />
          <h2 className="font-display text-sm font-semibold text-foreground">Surges actifs</h2>
        </div>

        {surgeEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun surge actif en ce moment</p>
        ) : (
          <div className="space-y-2">
            {surgeEvents.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <Zap className="w-4 h-4 text-amber-500" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">{s.city_slug} · {s.trade_slug}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Demande: {s.demand_count} · Offre: {s.supply_count} · ×{s.surge_multiplier}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Price simulator */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl border border-primary/20 bg-card/60 backdrop-blur-sm p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-foreground">Simulateur de prix</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Plan</Label>
            <select
              value={simCtx.planTier}
              onChange={(e) => setSimCtx(p => ({ ...p, planTier: e.target.value }))}
              className="w-full h-9 rounded-lg bg-muted/30 border border-border/40 text-xs text-foreground px-2"
            >
              {["recrue", "pro", "premium", "elite", "signature"].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Valeur projet ($)</Label>
            <Input
              type="number"
              value={simCtx.estimatedProjectValueCents / 100}
              onChange={(e) => setSimCtx(p => ({ ...p, estimatedProjectValueCents: Number(e.target.value) * 100 }))}
              className="h-9 text-xs bg-muted/30 border-border/40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Match (%)</Label>
            <Input
              type="number"
              value={simCtx.matchQualityScore}
              onChange={(e) => setSimCtx(p => ({ ...p, matchQualityScore: Number(e.target.value) }))}
              className="h-9 text-xs bg-muted/30 border-border/40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Urgence</Label>
            <select
              value={simCtx.urgencyLevel}
              onChange={(e) => setSimCtx(p => ({ ...p, urgencyLevel: e.target.value as any }))}
              className="w-full h-9 rounded-lg bg-muted/30 border border-border/40 text-xs text-foreground px-2"
            >
              {["low", "medium", "high", "emergency"].map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Demande</Label>
            <Input
              type="number"
              value={simCtx.demandCount}
              onChange={(e) => setSimCtx(p => ({ ...p, demandCount: Number(e.target.value) }))}
              className="h-9 text-xs bg-muted/30 border-border/40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Offre</Label>
            <Input
              type="number"
              value={simCtx.supplyCount}
              onChange={(e) => setSimCtx(p => ({ ...p, supplyCount: Number(e.target.value) }))}
              className="h-9 text-xs bg-muted/30 border-border/40"
            />
          </div>
        </div>

        {/* Result */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-foreground">Prix calculé</span>
            <span className="text-2xl font-bold font-display text-foreground">{formatCents(simResult.finalPriceCents)}</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground/70">Base</p>
              <p className="text-xs font-semibold text-foreground">{formatCents(simResult.basePriceCents)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/70">Multi.</p>
              <p className="text-xs font-semibold text-foreground">×{simResult.combinedMultiplier}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/70">Taille</p>
              <p className="text-xs font-semibold text-foreground">{simResult.projectSize}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/70">Surge</p>
              <p className={`text-xs font-semibold ${simResult.isSurge ? "text-amber-500" : "text-muted-foreground"}`}>
                {simResult.isSurge ? "Oui" : "Non"}
              </p>
            </div>
          </div>
          {!simResult.canAccess && (
            <div className="mt-3 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              Plan {simCtx.planTier} n'a pas accès aux projets {simResult.projectSize}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

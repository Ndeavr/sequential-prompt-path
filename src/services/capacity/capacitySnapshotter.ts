/**
 * UNPRO — Capacity Snapshotter
 * Computes capacity + exclusivity for every (trade × city) and writes snapshots + recommendations.
 * Designed to run from an edge function (cron) or admin trigger.
 */
import { supabase } from "@/integrations/supabase/client";
import { computeCapacity, type CapacityRule } from "./capacityEngine";
import { evaluateExclusivity, type ExclusivityRule } from "./exclusivityEngine";

export interface SnapshotterStats {
  cells: number;
  snapshots: number;
  recommendations: number;
  errors: string[];
}

export async function runCapacitySnapshot(): Promise<SnapshotterStats> {
  const stats: SnapshotterStats = { cells: 0, snapshots: 0, recommendations: 0, errors: [] };

  const [{ data: rules }, { data: cities }, { data: cpc }, { data: exRules }, { data: assignments }] =
    await Promise.all([
      supabase.from("trade_capacity_rules").select("*").eq("is_active", true),
      supabase.from("cities").select("slug, name, population").eq("is_active", true).gt("population", 5000),
      supabase.from("trade_cpc_benchmarks").select("trade_slug, city_slug, cpc_cad"),
      supabase.from("exclusivity_rules").select("*").eq("is_active", true),
      supabase.from("territory_assignments").select("city_slug, slot_type, active").eq("active", true),
    ]);

  if (!rules || !cities || !exRules) {
    stats.errors.push("Missing base data");
    return stats;
  }

  const cpcMap = new Map<string, number>();
  (cpc ?? []).forEach((b) => cpcMap.set(`${b.trade_slug}::${b.city_slug}`, Number(b.cpc_cad ?? 0)));

  const today = new Date().toISOString().slice(0, 10);
  const snapshotRows: any[] = [];
  const recoRows: any[] = [];

  for (const rule of rules as CapacityRule[]) {
    for (const city of cities) {
      const key = `${rule.trade_slug}::${city.slug}`;
      const cpcCad = cpcMap.get(key) ?? 5;
      const cap = computeCapacity({
        rule,
        population: city.population ?? 0,
        cpcCad,
        activePros: 0, // TODO: compute from contractor_service_areas when wired
      });
      stats.cells++;

      snapshotRows.push({
        trade_slug: rule.trade_slug,
        city_slug: city.slug,
        snapshot_date: today,
        base_cap: cap.baseCap,
        final_cap: cap.finalCap,
        active_pros: cap.activePros,
        saturation_score: cap.saturationScore,
        band: cap.band,
        cpc_tier: cap.cpcTier,
        gap: cap.gap,
        factors: cap.factors,
      });

      const taken: Record<string, number> = {};
      (assignments ?? [])
        .filter((a: any) => a.city_slug === city.slug)
        .forEach((a: any) => { taken[a.slot_type] = (taken[a.slot_type] ?? 0) + 1; });

      const evals = evaluateExclusivity({
        capacity: cap,
        rules: exRules as ExclusivityRule[],
        gapScore: cap.gap * 5,
        takenBySlot: taken as any,
      });

      for (const ev of evals) {
        recoRows.push({
          trade_slug: rule.trade_slug,
          city_slug: city.slug,
          slot_class: ev.slot_class,
          status: ev.status,
          remaining_slots: ev.remaining,
          monthly_value_cents: 0,
          justification: ev.justification,
          computed_at: new Date().toISOString(),
        });
      }
    }
  }

  // Batched upserts
  const chunk = <T,>(arr: T[], n: number) => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  };

  for (const batch of chunk(snapshotRows, 500)) {
    const { error } = await supabase.from("capacity_snapshots").upsert(batch, { onConflict: "trade_slug,city_slug,snapshot_date" });
    if (error) stats.errors.push(`snapshot: ${error.message}`);
    else stats.snapshots += batch.length;
  }
  for (const batch of chunk(recoRows, 500)) {
    const { error } = await supabase.from("capacity_recommendations").upsert(batch, { onConflict: "trade_slug,city_slug,slot_class" });
    if (error) stats.errors.push(`reco: ${error.message}`);
    else stats.recommendations += batch.length;
  }

  return stats;
}

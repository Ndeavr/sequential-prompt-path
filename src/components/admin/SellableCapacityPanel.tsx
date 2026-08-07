/**
 * UNPRO — Admin · Capacité vendable réelle (places entrepreneurs)
 * Source unique : public.acq_territory_slots + public.v_territory_capacity_admin
 * Occupation = entrepreneurs réellement payants uniquement.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Save, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

interface CapacityRow {
  id: string;
  city: string;
  trade: string;
  total_capacity: number;
  occupied: number;
  available: number;
  paid_contractors: number;
  admin_reserved: number;
  lock_status: string;
  scarcity_level: string | null;
  pricing_multiplier: number | null;
  updated_at: string;
}

const LEVEL_LABEL: Record<string, string> = {
  open: "Ouvert",
  moderate: "Modéré",
  high: "Élevé",
  critical: "Critique",
  full: "Complet",
};

const levelClass = (l: string | null) =>
  l === "full"
    ? "bg-red-500/15 text-red-300 border-red-500/30"
    : l === "critical"
      ? "bg-orange-500/15 text-orange-300 border-orange-500/30"
      : l === "high"
        ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
        : l === "moderate"
          ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
          : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";

export default function SellableCapacityPanel() {
  const [rows, setRows] = useState<CapacityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("v_territory_capacity_admin" as any)
      .select("*")
      .order("city")
      .order("trade");
    if (error) toast.error(error.message);
    setRows(((data as any[]) ?? []) as CapacityRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveCapacity = async (row: CapacityRow) => {
    const raw = drafts[row.id];
    const next = Number(raw);
    if (!Number.isFinite(next) || next < 0 || next > 500) {
      toast.error("Capacité invalide");
      return;
    }
    setSavingId(row.id);
    const { error } = await supabase
      .from("acq_territory_slots")
      .update({ max_slots: Math.round(next), updated_at: new Date().toISOString() })
      .eq("id", row.id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${row.city} · ${row.trade} → ${Math.round(next)} places`);
    setDrafts((d) => {
      const c = { ...d };
      delete c[row.id];
      return c;
    });
    await load();
  };

  const toggleLock = async (row: CapacityRow) => {
    const next = row.lock_status === "manual" ? "open" : "manual";
    const { error } = await supabase
      .from("acq_territory_slots")
      .update({ lock_status: next, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    await load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Capacité vendable réelle</CardTitle>
          <p className="text-xs text-muted-foreground">
            Places entrepreneurs par ville × métier. Occupation = abonnements payants confirmés uniquement.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="pb-2">Ville</th>
                <th>Métier</th>
                <th className="text-right">Capacité</th>
                <th className="text-right">Occupées</th>
                <th className="text-right">Disponibles</th>
                <th className="text-right">Rareté</th>
                <th className="text-right">Impact prix</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border/30">
                  <td className="py-2 font-medium">{r.city}</td>
                  <td className="capitalize">{r.trade}</td>
                  <td className="text-right">
                    <Input
                      className="ml-auto h-8 w-20 text-right"
                      value={drafts[r.id] ?? String(r.total_capacity)}
                      onChange={(e) => setDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                    />
                  </td>
                  <td className="text-right">
                    {r.occupied}
                    <span className="ml-1 text-xs text-muted-foreground">({r.paid_contractors} payants)</span>
                  </td>
                  <td className="text-right font-semibold">{r.available}</td>
                  <td className="text-right">
                    <Badge variant="outline" className={levelClass(r.scarcity_level)}>
                      {LEVEL_LABEL[r.scarcity_level ?? "open"] ?? r.scarcity_level}
                    </Badge>
                  </td>
                  <td className="text-right">×{Number(r.pricing_multiplier ?? 1).toFixed(2)}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={drafts[r.id] === undefined || savingId === r.id}
                        onClick={() => void saveCapacity(r)}
                      >
                        {savingId === r.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void toggleLock(r)}>
                        {r.lock_status === "manual" ? (
                          <Lock className="h-3.5 w-3.5 text-red-400" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">Aucune capacité configurée.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

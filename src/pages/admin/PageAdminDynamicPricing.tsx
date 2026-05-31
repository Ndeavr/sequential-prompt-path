import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface MarketRow {
  id: string;
  territory: string;
  trade: string;
  competition_score: number;
  demand_score: number;
  rarity_score: number;
  exclusivity_slots_total: number;
  exclusivity_slots_taken: number;
  avg_project_value_cents: number;
  recommended_min_plan: string;
}

interface Coef {
  id: string;
  key: string;
  value: number;
  description: string | null;
}

interface RecRow {
  id: string;
  contractor_id: string;
  recommended_plan_slug: string;
  recommended_price_cents: number;
  market_score: number;
  accepted: boolean;
  generated_at: string;
}

export default function PageAdminDynamicPricing() {
  const [markets, setMarkets] = useState<MarketRow[]>([]);
  const [coefs, setCoefs] = useState<Coef[]>([]);
  const [recs, setRecs] = useState<RecRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [m, c, r] = await Promise.all([
      supabase.from("territory_market_scores").select("*").order("territory"),
      supabase.from("pricing_engine_coefficients").select("*").order("key"),
      supabase.from("dynamic_plan_recommendations").select("*").order("generated_at", { ascending: false }).limit(50),
    ]);
    setMarkets((m.data as any) ?? []);
    setCoefs((c.data as any) ?? []);
    setRecs((r.data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveCoef(key: string, value: number) {
    const { error } = await supabase
      .from("pricing_engine_coefficients")
      .update({ value })
      .eq("key", key);
    if (error) toast.error(error.message);
    else toast.success(`Coefficient ${key} mis à jour`);
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dynamic Pricing</h1>
          <p className="text-white/60 text-sm mt-1">Moteur Plan IA — coefficients, saturation marché, audit recommandations.</p>
        </div>

        <Card className="bg-white/[0.03] border-white/10">
          <CardHeader><CardTitle className="text-white">Coefficients du moteur</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {coefs.map((c) => (
                <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">{c.key}</div>
                    <div className="text-xs text-white/50">{c.description}</div>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={c.value}
                    className="w-28 bg-white/5 border-white/10 text-white"
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (!isNaN(v) && v !== c.value) saveCoef(c.key, v);
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/10">
          <CardHeader><CardTitle className="text-white">Saturation des marchés</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60">Territoire</TableHead>
                  <TableHead className="text-white/60">Métier</TableHead>
                  <TableHead className="text-white/60">Demande</TableHead>
                  <TableHead className="text-white/60">Compétition</TableHead>
                  <TableHead className="text-white/60">Rareté</TableHead>
                  <TableHead className="text-white/60">Slots exclusivité</TableHead>
                  <TableHead className="text-white/60">Plan min.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {markets.map((m) => {
                  const saturation = m.exclusivity_slots_total
                    ? (m.exclusivity_slots_taken / m.exclusivity_slots_total) * 100
                    : 0;
                  return (
                    <TableRow key={m.id} className="border-white/5">
                      <TableCell className="font-medium">{m.territory}</TableCell>
                      <TableCell>{m.trade}</TableCell>
                      <TableCell>{m.demand_score}/100</TableCell>
                      <TableCell>{m.competition_score}/100</TableCell>
                      <TableCell>{m.rarity_score}/100</TableCell>
                      <TableCell>
                        <span className={saturation >= 80 ? "text-rose-400" : saturation >= 50 ? "text-amber-400" : "text-emerald-400"}>
                          {m.exclusivity_slots_taken}/{m.exclusivity_slots_total}
                        </span>
                      </TableCell>
                      <TableCell className="capitalize">{m.recommended_min_plan}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/10">
          <CardHeader><CardTitle className="text-white">Métiers sous-desservis (gap demande – compétition)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60">Territoire</TableHead>
                  <TableHead className="text-white/60">Métier</TableHead>
                  <TableHead className="text-white/60">Gap</TableHead>
                  <TableHead className="text-white/60">Demande</TableHead>
                  <TableHead className="text-white/60">Compétition</TableHead>
                  <TableHead className="text-white/60">Recommandation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...markets]
                  .map((m) => ({ ...m, gap: m.demand_score - m.competition_score }))
                  .sort((a, b) => b.gap - a.gap)
                  .slice(0, 10)
                  .map((m) => (
                    <TableRow key={`gap-${m.id}`} className="border-white/5">
                      <TableCell className="font-medium">{m.territory}</TableCell>
                      <TableCell>{m.trade}</TableCell>
                      <TableCell>
                        <span className={m.gap > 30 ? "text-emerald-400 font-semibold" : m.gap > 10 ? "text-amber-400" : "text-white/50"}>
                          {m.gap > 0 ? "+" : ""}{m.gap}
                        </span>
                      </TableCell>
                      <TableCell>{m.demand_score}/100</TableCell>
                      <TableCell>{m.competition_score}/100</TableCell>
                      <TableCell className="text-white/70 text-xs">
                        {m.gap > 30 ? "Recruter activement" : m.gap > 10 ? "Opportunité" : "Saturé"}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/10">
          <CardHeader><CardTitle className="text-white">Override prix manuel</CardTitle></CardHeader>
          <CardContent>
            <OverrideForm onSaved={load} />
          </CardContent>
        </Card>

        <Card className="bg-white/[0.03] border-white/10">
          <CardHeader><CardTitle className="text-white">Audit des recommandations (50 dernières)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60">Date</TableHead>
                  <TableHead className="text-white/60">Plan</TableHead>
                  <TableHead className="text-white/60">Prix</TableHead>
                  <TableHead className="text-white/60">Score marché</TableHead>
                  <TableHead className="text-white/60">Accepté</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recs.map((r) => (
                  <TableRow key={r.id} className="border-white/5">
                    <TableCell>{new Date(r.generated_at).toLocaleString("fr-CA")}</TableCell>
                    <TableCell className="capitalize">{r.recommended_plan_slug}</TableCell>
                    <TableCell>${(r.recommended_price_cents / 100).toLocaleString("fr-CA")}</TableCell>
                    <TableCell>{r.market_score}/100</TableCell>
                    <TableCell>{r.accepted ? "✓" : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!loading && recs.length === 0 && (
              <div className="text-center py-8 text-white/40 text-sm">Aucune recommandation générée pour le moment.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

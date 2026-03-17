/**
 * UNPRO — Admin City-Service-Demand Grid Dashboard
 */
import { useState } from "react";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemandGrid, useDemandGridStats } from "@/hooks/useDemandGrid";
import { getCurrentSeason, SEASONAL_SERVICES, type Season } from "@/services/demandGridEngine";
import { Grid3X3, TrendingUp, AlertTriangle, MapPin, Zap, FileText, Megaphone, Users } from "lucide-react";

export default function AdminDemandGrid() {
  const [cityFilter, setCityFilter] = useState("");
  const [tradeFilter, setTradeFilter] = useState("");
  const [seasonFilter, setSeasonFilter] = useState<string>("");
  const { data: cells = [], isLoading } = useDemandGrid({
    city: cityFilter || undefined,
    trade: tradeFilter || undefined,
    season: seasonFilter || undefined,
  });
  const { data: stats } = useDemandGridStats();
  const currentSeason = getCurrentSeason();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Grid3X3 className="h-6 w-6" /> Grille Demande × Marché
          </h1>
          <p className="text-sm text-muted-foreground">Dominez chaque combinaison ville × métier × service × saison</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniStat icon={<Grid3X3 className="h-4 w-4" />} label="Cellules" value={stats?.totalCells ?? 0} />
          <MiniStat icon={<AlertTriangle className="h-4 w-4" />} label="Opportunités" value={stats?.highGapCount ?? 0} color="text-orange-600" />
          <MiniStat icon={<FileText className="h-4 w-4" />} label="Pages SEO" value={stats?.withSeo ?? 0} />
          <MiniStat icon={<Megaphone className="h-4 w-4" />} label="Campagnes" value={stats?.withAds ?? 0} />
        </div>

        {/* Seasonal context */}
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Saison actuelle: {currentSeason}</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {SEASONAL_SERVICES[currentSeason].map((s) => (
                <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Ville…" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="w-40" />
          <Input placeholder="Métier…" value={tradeFilter} onChange={(e) => setTradeFilter(e.target.value)} className="w-40" />
          <Select value={seasonFilter} onValueChange={setSeasonFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Saison" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes</SelectItem>
              <SelectItem value="winter">Hiver</SelectItem>
              <SelectItem value="spring">Printemps</SelectItem>
              <SelectItem value="summer">Été</SelectItem>
              <SelectItem value="fall">Automne</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Chargement…</p>
        ) : cells.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune donnée. Lancez l'analyse de marché pour peupler la grille.</p>
        ) : (
          <div className="space-y-2">
            {cells.map((cell: any) => {
              const gapLevel = cell.gap_score > 60 ? "destructive" : cell.gap_score > 30 ? "secondary" : "outline";
              return (
                <Card key={cell.id} className="overflow-hidden">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-sm">{cell.trade_slug}</span>
                          <Badge variant="outline" className="text-[10px]">
                            <MapPin className="h-3 w-3 mr-0.5" />{cell.city_slug}
                          </Badge>
                          {cell.season && <Badge variant="outline" className="text-[10px]">{cell.season}</Badge>}
                        </div>
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                          <span>Demande: <strong>{cell.demand_score}</strong></span>
                          <span>Offre: <strong>{cell.supply_score}</strong></span>
                          <span>Gap: <Badge variant={gapLevel as any} className="text-[10px] ml-0.5">{cell.gap_score}</Badge></span>
                        </div>
                        <div className="flex gap-1 mt-2">
                          {cell.has_seo_page && <Badge variant="outline" className="text-[10px] text-green-700">SEO ✓</Badge>}
                          {cell.has_ad_campaign && <Badge variant="outline" className="text-[10px] text-blue-700">Ads ✓</Badge>}
                          {cell.has_contractors && <Badge variant="outline" className="text-[10px] text-purple-700">Pros ✓</Badge>}
                          {!cell.has_seo_page && !cell.has_ad_campaign && <Badge variant="destructive" className="text-[10px]">Non couvert</Badge>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-lg font-bold">#{cell.priority_rank || "—"}</span>
                        <p className="text-[10px] text-muted-foreground">priorité</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  return (
    <Card>
      <CardContent className="py-3 px-3 flex items-center gap-2">
        <div className={`${color ?? "text-primary"}`}>{icon}</div>
        <div>
          <p className="text-[10px] text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

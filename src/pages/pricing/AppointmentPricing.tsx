/**
 * UNPRO — Dynamic Appointment Pricing based on Google Ads CPL data
 * Shows real market-based pricing with seasonal adjustments.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, MapPin, Loader2, BarChart3 } from "lucide-react";
import {
  loadBenchmarks,
  loadSeasonalRules,
  computeSeasonalPrices,
  formatCentsToCAD,
  type AppointmentBenchmark,
  type SeasonalRule,
} from "@/services/appointmentPricingService";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<string, string> = {
  "toiture": "Toiture",
  "isolation": "Isolation",
  "thermopompe": "Thermopompe",
  "gouttieres": "Gouttières",
  "tonte-pelouse": "Tonte de pelouse",
  "amenagement-paysager": "Aménagement paysager",
  "pave-uni": "Pavé-uni",
  "excavation": "Excavation",
};

const MARKET_LABELS: Record<string, string> = {
  "montreal": "Montréal",
  "laval": "Laval",
  "quebec": "Québec",
  "longueuil": "Longueuil",
  "trois-rivieres": "Trois-Rivières",
  "sherbrooke": "Sherbrooke",
  "gatineau": "Gatineau",
};

function SeasonBadge({ multiplier, label }: { multiplier: number; label: string }) {
  if (multiplier > 1.1) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warning">
        <TrendingUp className="h-3 w-3" />
        +{Math.round((multiplier - 1) * 100)}%
      </span>
    );
  }
  if (multiplier < 0.9) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success">
        <TrendingDown className="h-3 w-3" />
        {Math.round((multiplier - 1) * 100)}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
      <Minus className="h-3 w-3" />
      Standard
    </span>
  );
}

export default function AppointmentPricing() {
  const [benchmarks, setBenchmarks] = useState<AppointmentBenchmark[]>([]);
  const [seasonalRules, setSeasonalRules] = useState<SeasonalRule[]>([]);
  const [selectedMarket, setSelectedMarket] = useState("montreal");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [b, s] = await Promise.all([loadBenchmarks(), loadSeasonalRules()]);
        setBenchmarks(b);
        setSeasonalRules(s);
      } catch (e) {
        console.error("Error loading pricing benchmarks:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const currentMonth = new Date().getMonth() + 1;
  const marketBenchmarks = benchmarks.filter(b => b.market_slug === selectedMarket);
  const pricedItems = computeSeasonalPrices(marketBenchmarks, seasonalRules, currentMonth);
  const availableMarkets = [...new Set(benchmarks.map(b => b.market_slug))].sort();

  return (
    <section className="px-5 py-16">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-primary/10 text-primary text-sm font-semibold mb-4">
            <BarChart3 className="h-3.5 w-3.5" /> Basé sur données Google Ads réelles
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Prix des rendez-vous garantis</h2>
          <p className="text-muted-foreground mt-2">Tarification dynamique selon le marché, la catégorie et la saison</p>
        </motion.div>

        {/* Market selector */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 flex-wrap justify-center">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {availableMarkets.map(market => (
              <button
                key={market}
                onClick={() => setSelectedMarket(market)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  selectedMarket === market
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {MARKET_LABELS[market] || market}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-4 font-semibold text-foreground">Catégorie</th>
                    <th className="text-right p-4 font-semibold text-foreground hidden sm:table-cell">CPL Google</th>
                    <th className="text-right p-4 font-semibold text-foreground">Prix UNPRO</th>
                    <th className="text-right p-4 font-semibold text-foreground">Saison</th>
                    <th className="text-right p-4 font-semibold text-foreground">Prix actuel</th>
                  </tr>
                </thead>
                <tbody>
                  {pricedItems.map((item, i) => (
                    <tr key={item.id} className={cn("border-b border-border/50", i % 2 !== 0 && "bg-muted/10")}>
                      <td className="p-4">
                        <span className="font-medium text-foreground">
                          {CATEGORY_LABELS[item.category_slug] || item.category_slug}
                        </span>
                      </td>
                      <td className="p-4 text-right text-muted-foreground hidden sm:table-cell">
                        {formatCentsToCAD(item.google_ads_cpl_cents)}
                      </td>
                      <td className="p-4 text-right text-muted-foreground">
                        {formatCentsToCAD(item.final_appointment_price_cents)}
                      </td>
                      <td className="p-4 text-right">
                        <SeasonBadge multiplier={item.season_multiplier} label={item.season_label} />
                      </td>
                      <td className="p-4 text-right">
                        <span className={cn(
                          "font-bold text-lg",
                          item.season_multiplier > 1.1 ? "text-warning" :
                          item.season_multiplier < 0.9 ? "text-success" : "text-foreground"
                        )}>
                          {formatCentsToCAD(item.seasonal_price_cents)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {pricedItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        Aucune donnée disponible pour ce marché.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Prix = CPL Google Ads + 30% marge UNPRO × multiplicateur saisonnier.{" "}
                <span className="text-foreground font-medium">Mise à jour selon les données réelles du marché.</span>
              </p>
              <Link to="/classification-projets" className="text-sm text-primary hover:underline underline-offset-2 whitespace-nowrap">
                Comment les projets sont classés →
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}

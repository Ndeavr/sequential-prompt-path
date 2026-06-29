/**
 * UNPRO — Demand-first contractor landing.
 * Route: /pro/demande/:city/:category
 * Headline pulled live from market_demand. CTA leads to the existing 7-step onboarding.
 */
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, DollarSign, ArrowRight } from "lucide-react";

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

export default function PageContractorDemandLanding() {
  const { city = "", category = "" } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["recruitment-landing", city, category],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("recruitment-landing-resolver", {
        body: null,
        method: "GET",
        // workaround: pass via path query
      } as any);
      // fallback to direct read
      if (error || !data?.ok) {
        const { data: market } = await supabase
          .from("market_demand")
          .select("*")
          .eq("city", city)
          .eq("category", category.toLowerCase())
          .maybeSingle();
        const { data: neighbors } = await supabase
          .from("market_demand")
          .select("city, category, homeowner_count, estimated_revenue, pressure_score")
          .eq("category", category.toLowerCase())
          .neq("city", city)
          .order("pressure_score", { ascending: false })
          .limit(5);
        return { market, neighbor_segments: neighbors ?? [] };
      }
      return data;
    },
    enabled: !!city && !!category,
  });

  const market = data?.market ?? null;
  const neighbors = data?.neighbor_segments ?? [];
  const cityLabel = decodeURIComponent(city);
  const catLabel = decodeURIComponent(category);
  const count = market?.homeowner_count ?? 0;
  const revenue = Number(market?.estimated_revenue ?? 0);

  return (
    <div className="min-h-screen bg-background landing-warm">
      <main className="mx-auto max-w-3xl px-4 py-12 space-y-10">
        <header className="space-y-4 text-center">
          <Badge variant="outline" className="mx-auto">Demande active</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            {isLoading ? "…" : count} propriétaires cherchent actuellement un {catLabel} à {cityLabel}.
          </h1>
          <p className="text-lg text-muted-foreground">
            Activez votre profil et devenez visible immédiatement. Aucun frais d'inscription. Premier rendez-vous garanti.
          </p>
        </header>

        <Card className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Stat icon={<Users className="h-5 w-5" />} label="Propriétaires en attente" value={String(count)} />
          <Stat icon={<DollarSign className="h-5 w-5" />} label="Demande estimée" value={fmtMoney(revenue)} />
          <Stat icon={<TrendingUp className="h-5 w-5" />} label="Pression marché" value={pressureLabel(Number(market?.pressure_score ?? 0))} />
        </Card>

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={() => navigate(`/contractor-onboarding?city=${encodeURIComponent(cityLabel)}&category=${encodeURIComponent(catLabel)}&source=demand_landing`)}
          >
            Activer mon profil — $1 / 7 jours <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {neighbors.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Autres villes avec forte demande</h2>
            <div className="grid gap-2">
              {neighbors.map((n: any) => (
                <a
                  key={n.city}
                  href={`/pro/demande/${encodeURIComponent(n.city)}/${encodeURIComponent(n.category)}`}
                  className="flex items-center justify-between rounded-xl border bg-card p-4 hover:bg-accent transition"
                >
                  <span className="font-medium capitalize">{n.category} · {n.city}</span>
                  <span className="text-sm text-muted-foreground">{n.homeowner_count} en attente · {fmtMoney(Number(n.estimated_revenue))}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-2 rounded-full bg-primary/10 p-3">{icon}</div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

function pressureLabel(score: number): string {
  if (score > 1_000_000) return "Élevée";
  if (score > 100_000) return "Moyenne";
  return "Émergente";
}

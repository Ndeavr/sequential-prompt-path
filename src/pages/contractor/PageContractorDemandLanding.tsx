/**
 * UNPRO — Demand-first contractor landing.
 * Route: /pro/demande/:city/:category
 * Uses existing aggregate demand data; never fabricates live customers or appointments.
 */
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildDemandLandingCopy } from "@/lib/demand/demandLandingCopy";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowRight } from "lucide-react";

export default function PageContractorDemandLanding() {
  const { city = "", category = "" } = useParams();
  const navigate = useNavigate();
  const cityLabel = decodeURIComponent(city);
  const catLabel = decodeURIComponent(category);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["recruitment-landing", cityLabel, catLabel],
    queryFn: async () => {
      // Read the existing publicly available aggregate, without a broken
      // resolver GET lacking city/category query parameters.
      const [{ data: market, error: marketError }, { data: neighbors, error: neighborsError }] = await Promise.all([
        supabase
          .from("market_demand")
          .select("city, category, homeowner_count, estimated_revenue, last_signal_at")
          .eq("city", cityLabel)
          .eq("category", catLabel.toLowerCase())
          .maybeSingle(),
        supabase
          .from("market_demand")
          .select("city, category, homeowner_count")
          .eq("category", catLabel.toLowerCase())
          .neq("city", cityLabel)
          .gt("homeowner_count", 0)
          .order("homeowner_count", { ascending: false })
          .limit(5),
      ]);
      if (marketError) throw marketError;
      if (neighborsError) throw neighborsError;
      return { market, neighbors: neighbors ?? [] };
    },
    enabled: !!city && !!category,
  });

  const copy = buildDemandLandingCopy(cityLabel, catLabel, data?.market?.homeowner_count);
  const neighbors = data?.neighbors ?? [];

  return (
    <div className="min-h-screen bg-background landing-warm">
      <main className="mx-auto max-w-3xl px-4 py-12 space-y-10">
        <header className="space-y-4 text-center">
          <Badge variant="outline" className="mx-auto">{copy.badge}</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            {isLoading ? "Recherche des informations du secteur…" : copy.title}
          </h1>
          <p className="text-lg text-muted-foreground">{copy.description}</p>
          {isError && (
            <p role="status" className="text-sm text-muted-foreground">
              Les données du secteur sont temporairement indisponibles. Vous pouvez tout de même découvrir UNPRO.
            </p>
          )}
        </header>

        {!isLoading && !isError && copy.hasRecordedDemand && (
          <Card className="p-6">
            <Stat label="Demandes enregistrées dans ce secteur" value={String(copy.count)} />
          </Card>
        )}

        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={() => navigate(`/entrepreneur/devis-personnalise?city=${encodeURIComponent(cityLabel)}&trade=${encodeURIComponent(catLabel)}&source=demand_landing`)}
          >
            Découvrir mon offre personnalisée <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {neighbors.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Demandes enregistrées dans les environs</h2>
            <div className="grid gap-2">
              {neighbors.map((n) => (
                <a
                  key={n.city}
                  href={`/pro/demande/${encodeURIComponent(n.city)}/${encodeURIComponent(n.category)}`}
                  className="flex items-center justify-between rounded-xl border bg-card p-4 hover:bg-accent transition"
                >
                  <span className="font-medium capitalize">{n.category} · {n.city}</span>
                  <span className="text-sm text-muted-foreground">{n.homeowner_count} demande(s) enregistrée(s)</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-center gap-3 text-center">
      <Users aria-hidden="true" className="h-5 w-5 text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

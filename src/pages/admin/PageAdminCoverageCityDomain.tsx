import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageHero from "@/components/shared/PageHero";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, CheckCircle } from "lucide-react";

interface CoverageCell {
  city_id: string;
  city_name: string;
  domain_id: string;
  domain_name: string;
  count: number;
  approved: number;
}

export default function PageAdminCoverageCityDomain() {
  const { data, isLoading } = useQuery({
    queryKey: ["coverage-city-domain"],
    queryFn: async () => {
      const { data: mappings } = await supabase
        .from("company_city_domains")
        .select("city_id, domain_id, status, cities(name), service_domains(name)")
        .limit(1000);

      if (!mappings) return { cells: [] as CoverageCell[], cities: [] as string[], domains: [] as string[] };

      const cellMap = new Map<string, CoverageCell>();
      for (const m of mappings as any[]) {
        const key = `${m.city_id}-${m.domain_id}`;
        if (!cellMap.has(key)) {
          cellMap.set(key, {
            city_id: m.city_id,
            city_name: m.cities?.name ?? "?",
            domain_id: m.domain_id,
            domain_name: m.service_domains?.name ?? "?",
            count: 0,
            approved: 0,
          });
        }
        const cell = cellMap.get(key)!;
        cell.count++;
        if (m.status === "active") cell.approved++;
      }

      const cells = Array.from(cellMap.values());
      const cities = [...new Set(cells.map((c) => c.city_name))].sort();
      const domains = [...new Set(cells.map((c) => c.domain_name))].sort();

      return { cells, cities, domains };
    },
  });

  return (
    <>
      <Helmet>
        <title>Couverture Ville × Domaine — UNPRO Admin</title>
      </Helmet>
      <div className="min-h-screen bg-background">
        <PageHero title="Couverture Ville × Domaine" subtitle="Visualisation de la densité d'extraction par combinaison ville/service." compact />

        <div className="max-w-7xl mx-auto px-4 pb-12">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : data?.cells.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucune combinaison ville × domaine trouvée.</p>
              <p className="text-xs mt-1">Les données apparaîtront après l'extraction.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {data?.cells.map((cell) => (
                <Card key={`${cell.city_id}-${cell.domain_id}`} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{cell.city_name}</p>
                        <p className="text-xs text-primary/80">{cell.domain_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{cell.count}</p>
                        <p className="text-[10px] text-muted-foreground">entreprises</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[11px]">
                      <CheckCircle className="w-3 h-3 text-success" />
                      <span className="text-success">{cell.approved} approuvées</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

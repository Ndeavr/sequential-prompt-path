import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface VisitStats {
  views: number;
  sessions: number;
  excludedViews: number;
  missingSessionViews: number;
  firstVisit: string | null;
}

/** Aggregate-only RPC: never fetch another visitor's private event rows. */
export function AffiliateVisitStats({ affiliateId }: { affiliateId?: string | null }) {
  const { data, isPending, isError } = useQuery<VisitStats>({
    queryKey: ["affiliate-visit-stats", affiliateId],
    enabled: !!affiliateId,
    refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_affiliate_visit_stats", {
        p_affiliate_id: affiliateId,
      });
      if (error) throw error;
      if (!data || typeof data.views !== "number" || typeof data.sessions !== "number") {
        throw new Error("Statistiques indisponibles");
      }
      return data as VisitStats;
    },
  });

  return (
    <section aria-label="Visites de mon lien public" className="rounded-2xl border border-border/40 bg-card p-5 space-y-3">
      <h2 className="font-semibold text-foreground">Visites de mon lien public</h2>
      {isError ? <p role="status" className="text-sm text-muted-foreground">Suivi temporairement indisponible. Réessayez dans un instant.</p>
        : isPending ? <p role="status" className="text-sm text-muted-foreground">Chargement des visites…</p>
        : data ? <>
          <p className="text-xs text-muted-foreground">Tout l’historique disponible{data.firstVisit ? ` · depuis le ${new Date(data.firstVisit).toLocaleDateString("fr-CA", { timeZone: "America/Toronto" })}` : ""}</p>
          <dl className="grid grid-cols-2 gap-3">
            <div><dt className="text-sm text-muted-foreground">Affichages</dt><dd className="text-2xl font-bold">{data.views}</dd></div>
            <div><dt className="text-sm text-muted-foreground">Sessions uniques</dt><dd className="text-2xl font-bold">{data.sessions}</dd></div>
          </dl>
          <p className="text-xs text-muted-foreground">{data.excludedViews} affichage(s) interne(s) ou de test exclu(s). Les sessions ne représentent pas nécessairement des personnes différentes.</p>
          {data.missingSessionViews > 0 && <p className="text-xs text-muted-foreground">{data.missingSessionViews} affichage(s) sans identifiant de session.</p>}
        </> : null}
    </section>
  );
}

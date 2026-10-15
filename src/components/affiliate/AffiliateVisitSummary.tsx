import { useAffiliateVisitStats } from "@/hooks/useAffiliateVisitStats";
import { Button } from "@/components/ui/button";

export function AffiliateVisitSummary({ affiliateId }: { affiliateId?: string }) {
  const query = useAffiliateVisitStats(affiliateId);
  const totals = query.data?.reduce((sum, row) => ({
    all: sum.all + Number(row.total_sessions),
    internal: sum.internal + Number(row.internal_sessions),
    attributed: sum.attributed + Number(row.attributed_sessions),
  }), { all: 0, internal: 0, attributed: 0 });
  return <section aria-label="Visites affiliées" className="rounded-2xl border border-border/40 bg-card p-5 space-y-3">
    <h2 className="font-semibold">Visites du parcours entrepreneur</h2>
    <p className="text-xs text-muted-foreground">Depuis le début du suivi · une visite par session de navigation</p>
    {query.isPending ? <p role="status">Chargement des visites…</p> : query.isError ?
      <div role="alert"><p>Les visites sont temporairement indisponibles.</p><Button variant="outline" size="sm" onClick={() => void query.refetch()}>Réessayer</Button></div> :
      <>
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-2xl font-semibold tabular-nums">{totals?.attributed ?? 0}</p><p className="text-sm">Visites attribuées</p></div>
          <div><p className="text-2xl font-semibold tabular-nums">{totals?.internal ?? 0}</p><p className="text-sm">Visites internes / tests identifiables</p></div>
        </div>
        <p className="text-xs text-muted-foreground">{totals?.all ?? 0} sessions enregistrées au total. Les visites internes sont exclues des visites attribuées. Une session ne confirme ni un nouveau prospect ni une inscription.</p>
      </>}
  </section>;
}

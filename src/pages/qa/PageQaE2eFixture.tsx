import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/** Internal QA landing for E2E tracked links. Never indexed, never a conversion. */
export const QA_ROUTE_MARKER = "UNPRO-QA-E2E-FIXTURE-V1";

export default function PageQaE2eFixture() {
  const [params] = useSearchParams();
  const run = (params.get("run") ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 36);
  useEffect(() => {
    document.title = "TEST INTERNE — UNPRO QA";
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!meta) { meta = document.createElement("meta"); meta.name = "robots"; document.head.appendChild(meta); }
    meta.content = "noindex,nofollow";
  }, []);
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6" data-qa-marker={QA_ROUTE_MARKER}>
      <section className="max-w-md w-full rounded-3xl border border-border bg-card p-8 text-center space-y-3">
        <p className="text-xs font-bold tracking-widest text-destructive">TEST INTERNE</p>
        <h1 className="text-2xl font-bold text-foreground">Page de vérification UNPRO</h1>
        <p className="text-muted-foreground">Ce lien sert uniquement aux tests internes. Aucune offre, aucun paiement.</p>
        {run && <p className="text-sm text-foreground">Exécution : <code>{run}</code></p>}
      </section>
    </main>
  );
}

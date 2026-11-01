import { Helmet } from "react-helmet-async";
import { useSearchParams } from "react-router-dom";

/** QA-only landing for E2E tracked-link clicks. Not a conversion page. */
export default function PageQaE2eFixture() {
  const [params] = useSearchParams();
  const run = (params.get("run") ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 16);
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <Helmet>
        <title>Test interne UNPRO</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <div className="max-w-md rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-sm font-semibold text-muted-foreground">TEST INTERNE — QA</p>
        <h1 className="mt-2 text-xl font-semibold">Lien de suivi vérifié</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Cette page sert uniquement aux tests automatiques UNPRO. Elle n'est ni une offre ni une inscription.
        </p>
        {run && <p className="mt-3 text-xs text-muted-foreground">Exécution : {run}</p>}
      </div>
    </main>
  );
}

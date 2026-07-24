/**
 * /admin/seo-health — OG image verifier
 *
 * Fetches any URL through the `seo-og-inspect` edge function and reports:
 *   - og:title / og:description / og:image / og:url
 *   - twitter:card / twitter:image
 *   - canonical
 *   - OK / ERROR status against the current expected OG image
 *
 * Also provides one-click launchers for Facebook, LinkedIn, X and Google
 * Rich Results debuggers (server-to-server calls to those platforms require
 * API tokens we don't need for a spot check).
 */
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, ExternalLink, Loader2 } from "lucide-react";

const EXPECTED_OG_IMAGE = "https://unpro.ca/og/unpro-og-v4.jpg?v=20260724";

const KEY_ROUTES = [
  { label: "Accueil", url: "https://unpro.ca/" },
  { label: "Entrepreneurs", url: "https://unpro.ca/entrepreneurs" },
  { label: "Copropriété", url: "https://unpro.ca/gestion-copropriete-quebec" },
  { label: "Journal", url: "https://unpro.ca/journal" },
  { label: "Alex", url: "https://unpro.ca/alex" },
  { label: "Passeport Maison", url: "https://unpro.ca/passeport-maison" },
  { label: "Recommandations", url: "https://unpro.ca/recommandations" },
];

interface InspectResult {
  ok: boolean;
  url: string;
  status?: number;
  meta?: {
    title: string | null;
    description: string | null;
    canonical: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    ogUrl: string | null;
    ogType: string | null;
    twitterCard: string | null;
    twitterImage: string | null;
  };
  matchesExpected?: boolean;
  expectedOgImage?: string;
  error?: string;
}

async function inspect(url: string): Promise<InspectResult> {
  const { data, error } = await supabase.functions.invoke("seo-og-inspect", { body: { url } });
  if (error) return { ok: false, url, error: error.message };
  return data as InspectResult;
}

function StatusBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-500 text-xs font-semibold px-2 py-0.5">
      <CheckCircle2 className="w-3 h-3" /> OK
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 text-destructive text-xs font-semibold px-2 py-0.5">
      <XCircle className="w-3 h-3" /> ERROR
    </span>
  );
}

function ResultRow({ result }: { result: InspectResult }) {
  const m = result.meta;
  const ok = !!result.ok && !!result.matchesExpected;
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <a href={result.url} target="_blank" rel="noreferrer" className="font-mono text-xs truncate max-w-[70%] hover:underline">
          {result.url}
        </a>
        <StatusBadge ok={ok} />
      </div>
      {result.error && (
        <div className="text-xs text-destructive">Erreur : {result.error}</div>
      )}
      {m && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs">
          <div><span className="text-muted-foreground">og:title</span> — {m.ogTitle ?? m.title ?? "—"}</div>
          <div><span className="text-muted-foreground">og:description</span> — {m.ogDescription ?? m.description ?? "—"}</div>
          <div className="md:col-span-2 break-all">
            <span className="text-muted-foreground">og:image</span> —{" "}
            <span className={m.ogImage && m.ogImage.includes("unpro-og-v3.jpg") ? "text-emerald-500" : "text-destructive"}>
              {m.ogImage ?? "—"}
            </span>
          </div>
          <div className="md:col-span-2 break-all">
            <span className="text-muted-foreground">twitter:image</span> —{" "}
            <span className={m.twitterImage && m.twitterImage.includes("unpro-og-v3.jpg") ? "text-emerald-500" : "text-destructive"}>
              {m.twitterImage ?? "—"}
            </span>
          </div>
          <div><span className="text-muted-foreground">twitter:card</span> — {m.twitterCard ?? "—"}</div>
          <div className="break-all"><span className="text-muted-foreground">canonical</span> — {m.canonical ?? "—"}</div>
        </div>
      )}
      <div className="flex flex-wrap gap-2 pt-2">
        <a className="text-[11px] inline-flex items-center gap-1 text-primary hover:underline" target="_blank" rel="noreferrer" href={`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(result.url)}`}>
          Facebook <ExternalLink className="w-3 h-3" />
        </a>
        <a className="text-[11px] inline-flex items-center gap-1 text-primary hover:underline" target="_blank" rel="noreferrer" href={`https://www.linkedin.com/post-inspector/inspect/${encodeURIComponent(result.url)}`}>
          LinkedIn <ExternalLink className="w-3 h-3" />
        </a>
        <a className="text-[11px] inline-flex items-center gap-1 text-primary hover:underline" target="_blank" rel="noreferrer" href={`https://cards-dev.twitter.com/validator?url=${encodeURIComponent(result.url)}`}>
          X / Twitter <ExternalLink className="w-3 h-3" />
        </a>
        <a className="text-[11px] inline-flex items-center gap-1 text-primary hover:underline" target="_blank" rel="noreferrer" href={`https://search.google.com/test/rich-results?url=${encodeURIComponent(result.url)}`}>
          Google Rich Results <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

export default function PageAdminSeoHealth() {
  const [customUrl, setCustomUrl] = useState("https://unpro.ca/");
  const [results, setResults] = useState<InspectResult[]>([]);

  const single = useMutation({
    mutationFn: (url: string) => inspect(url),
    onSuccess: (r) => setResults((prev) => [r, ...prev.filter((p) => p.url !== r.url)]),
  });

  const bulk = useMutation({
    mutationFn: async () => {
      const out: InspectResult[] = [];
      for (const r of KEY_ROUTES) out.push(await inspect(r.url));
      return out;
    },
    onSuccess: (rs) => setResults(rs),
  });

  return (
    <DashboardLayout>
      <Helmet><title>SEO Health — UNPRO</title></Helmet>
      <div className="admin-theme min-h-screen p-6 max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">SEO Health — Open Graph</h1>
          <p className="text-sm text-muted-foreground">
            Vérifie ce que voient réellement les crawlers sociaux (Facebook, LinkedIn, iMessage, X,
            Google Messages) à partir du HTML rendu côté serveur.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Image OG attendue : <code className="font-mono">{EXPECTED_OG_IMAGE}</code>
          </p>
        </header>

        <div className="rounded-2xl border border-border/40 p-4 bg-card/40 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider">URL à tester</label>
          <div className="flex gap-2">
            <input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="flex-1 rounded-lg border border-border/40 bg-background px-3 py-2 text-sm font-mono"
              placeholder="https://unpro.ca/..."
            />
            <Button disabled={single.isPending} onClick={() => single.mutate(customUrl)}>
              {single.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyser"}
            </Button>
          </div>
          <Button variant="secondary" disabled={bulk.isPending} onClick={() => bulk.mutate()} className="w-full">
            {bulk.isPending ? "Analyse en cours…" : `Tester les ${KEY_ROUTES.length} routes-clés d'un coup`}
          </Button>
        </div>

        <div className="space-y-3">
          {results.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              Aucun résultat pour l'instant. Lance une analyse.
            </div>
          )}
          {results.map((r) => <ResultRow key={r.url} result={r} />)}
        </div>
      </div>
    </DashboardLayout>
  );
}

/**
 * PageRecommendations — top match reveal + book action.
 * Server data is optional; falls back to a functional stub with a canonical
 * "book appointment" CTA so the page is never a dead end.
 */
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageShell from "@/layouts/PageShell";
import PrimaryCTA from "@/components/cta/PrimaryCTA";

interface Recommendation {
  contractor_id: string;
  name: string;
  city: string | null;
  score: number;
  reason: string | null;
}

export default function PageRecommendations() {
  const [params] = useSearchParams();
  const projectId = params.get("project") ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["recommendations", projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<Recommendation[]> => {
      const { data, error } = await supabase
        .from("matches" as never)
        .select("*")
        .eq("project_id", projectId)
        .order("score", { ascending: false })
        .limit(3);
      if (error) return [];
      return (data as unknown as Recommendation[]) ?? [];
    },
  });

  const top = data?.[0];

  return (
    <PageShell id="recommendations" variant="app" cta={false}>
      <section className="mx-auto max-w-2xl px-5 pt-16 pb-8 text-white">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Recommandation principale
        </h1>
        <p className="mt-2 text-white/70">
          Un entrepreneur sélectionné pour votre projet, prêt à confirmer un
          rendez-vous.
        </p>

        <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          {isLoading ? (
            <p className="text-white/60">Analyse en cours…</p>
          ) : top ? (
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-medium">{top.name}</h2>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">
                  Score {Math.round(top.score)}
                </span>
              </div>
              {top.city && <p className="mt-1 text-sm text-white/60">{top.city}</p>}
              {top.reason && <p className="mt-3 text-sm text-white/70">{top.reason}</p>}
            </div>
          ) : (
            <div className="text-white/70">
              <p className="font-medium text-white">Nous confirmons votre entrepreneur.</p>
              <p className="mt-1 text-sm">
                Alex finalise la recommandation. Vous pouvez déjà réserver un
                créneau prioritaire.
              </p>
            </div>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <PrimaryCTA cta="book" size="lg" label="Prendre rendez-vous" />
            <PrimaryCTA cta="alex" size="lg" variant="secondary" label="Poser une question à Alex" />
          </div>
        </div>
      </section>
    </PageShell>
  );
}

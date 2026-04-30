/**
 * UNPRO — /tuyaux-plomb/:quartier (Neighborhood-level page)
 * Lighter variant focusing on a quartier; resolves city via neighborhood profile.
 */
import { useEffect, useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SeoHead from "@/seo/components/SeoHead";
import { Card } from "@/components/ui/card";
import { Droplets, MapPin } from "lucide-react";
import { injectJsonLd, faqSchema, breadcrumbSchema } from "@/lib/seoSchema";
import { trackLeadPipeEvent } from "@/hooks/useLeadPipe";

export default function PageTuyauxPlombQuartier() {
  const { quartier } = useParams<{ quartier: string }>();
  const slug = (quartier ?? "").toLowerCase();

  const { data, isLoading } = useQuery({
    queryKey: ["neighborhood-profile", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase.from("lead_pipe_neighborhood_profiles") as any)
        .select("*")
        .eq("neighborhood_slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data?.city_slug) trackLeadPipeEvent({ citySlug: data.city_slug, slug, event: "view_neighborhood" });
  }, [data?.city_slug, slug]);

  const year = new Date().getFullYear() + 1;
  const faq = useMemo(() => data ? [
    { question: `${data.neighborhood} a-t-il un risque élevé de plomb?`, answer: `${data.neighborhood} présente un indice de risque estimé à ${data.risk_index}/100, lié à un parc immobilier dont l'année moyenne est ${data.avg_build_year ?? "ancienne"}.` },
    { question: `Que faire si je vis à ${data.neighborhood}?`, answer: `Faire un test d'eau certifié et planifier une inspection plomberie avec un plombier UNPRO recommandé.` },
  ] : [], [data]);

  useEffect(() => {
    if (!data) return;
    const cleanups = [
      injectJsonLd(faqSchema(faq)),
      injectJsonLd(breadcrumbSchema([
        { name: "UNPRO", url: "https://unpro.ca" },
        { name: "Tuyaux Plomb", url: "https://unpro.ca/plomb-eau" },
        { name: data.neighborhood, url: `https://unpro.ca/tuyaux-plomb/${slug}` },
      ])),
    ];
    return () => cleanups.forEach((c) => c());
  }, [data, faq, slug]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Chargement…</div>;
  }
  if (!data) return <Navigate to="/plomb-eau/montreal" replace />;

  return (
    <>
      <SeoHead
        title={`Tuyaux de Plomb à ${data.neighborhood} — Risque, Test & Plombier UNPRO`}
        description={`Risque plomb à ${data.neighborhood}: indice ${data.risk_index}/100. Vérifiez votre adresse et trouvez un plombier vérifié.`}
        canonical={`https://unpro.ca/tuyaux-plomb/${slug}`}
      />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/40 to-white">
        <section className="px-4 pt-12 pb-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-blue-600 text-xs uppercase tracking-wider mb-3">
            <Droplets className="size-4" /><span>Quartier · {data.neighborhood}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
            Tuyaux de Plomb à {data.neighborhood} en {year}
          </h1>
          <p className="text-muted-foreground mt-3">
            {data.notes ?? `Quartier où l'âge moyen des bâtiments suggère une vigilance particulière sur la plomberie.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Card className="px-3 py-2 text-xs bg-white/80">
              Indice quartier : <span className="font-bold text-blue-700">{data.risk_index}/100</span>
            </Card>
            {data.avg_build_year && (
              <Card className="px-3 py-2 text-xs bg-white/80">
                Année moyenne : <span className="font-bold">{data.avg_build_year}</span>
              </Card>
            )}
          </div>

          <div className="mt-8">
            <Link
              to={`/plomb-eau/${data.city_slug}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
            >
              <MapPin className="size-4" /> Vérifier mon adresse
            </Link>
          </div>
        </section>

        <section className="px-4 pb-12 max-w-3xl mx-auto space-y-3">
          <h2 className="text-xl font-bold">Questions fréquentes</h2>
          {faq.map((q, i) => (
            <Card key={i} className="p-4 bg-white/80">
              <div className="font-semibold text-sm mb-1">{q.question}</div>
              <div className="text-sm text-muted-foreground">{q.answer}</div>
            </Card>
          ))}
        </section>
      </main>
    </>
  );
}

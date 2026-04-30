/**
 * UNPRO — /plomb-eau/:ville Page (SEO + AEO)
 * Public dynamic page with hero, analyze CTA, FAQ, internal links, schemas.
 */
import { useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import SeoHead from "@/seo/components/SeoHead";
import { useLeadPipeCityProfile, useLeadPipeNeighborhoods, useTopLeadPipeCities, trackLeadPipeEvent } from "@/hooks/useLeadPipe";
import PlombEauPropertyPicker from "@/features/leadPipe/PlombEauPropertyPicker";
import { Card } from "@/components/ui/card";
import { Droplets, ShieldAlert, FlaskConical, Home as HomeIcon, MapPin } from "lucide-react";
import { injectJsonLd, faqSchema, breadcrumbSchema, websiteSchema } from "@/lib/seoSchema";

export default function PagePlombEauCity() {
  const { ville } = useParams<{ ville: string }>();
  const citySlug = (ville ?? "").toLowerCase();
  const { data: profile, isLoading } = useLeadPipeCityProfile(citySlug);
  const { data: neighborhoods } = useLeadPipeNeighborhoods(citySlug);
  const { data: topCities } = useTopLeadPipeCities(12);

  useEffect(() => {
    if (citySlug) trackLeadPipeEvent({ citySlug, slug: citySlug, event: "view" });
  }, [citySlug]);

  const cityName = profile?.city ?? (citySlug.charAt(0).toUpperCase() + citySlug.slice(1));
  const year = new Date().getFullYear() + 1;

  const faq = useMemo(() => [
    {
      question: `Comment savoir si mon immeuble à ${cityName} a des tuyaux en plomb?`,
      answer: `Les bâtiments construits avant 1975, particulièrement les plex, sont les plus susceptibles d'avoir des conduites en plomb ou plomberie ancienne. Une inspection visuelle de l'entrée d'eau et un test certifié de l'eau confirment la présence de plomb.`,
    },
    {
      question: `Quel est le risque réel à ${cityName} en ${year}?`,
      answer: profile?.hero_summary ?? `${cityName} présente un indice de risque estimé de ${profile?.risk_index ?? "—"}/100 selon l'âge moyen des bâtiments et l'historique des conduites publiques.`,
    },
    {
      question: `Que faire si je découvre du plomb dans mon eau?`,
      answer: `Faire effectuer un test certifié, installer un filtre certifié NSF/ANSI 53, et planifier une inspection avec un plombier UNPRO pour évaluer le remplacement partiel ou complet des conduites.`,
    },
    {
      question: `UNPRO trouve-t-il automatiquement un plombier près de chez moi?`,
      answer: `Oui. UNPRO recommande automatiquement un plombier vérifié disponible à ${cityName}, sans que vous ayez à chercher ou à recevoir 5 soumissions.`,
    },
  ], [cityName, profile, year]);

  useEffect(() => {
    if (!citySlug) return;
    const cleanups = [
      injectJsonLd(websiteSchema()),
      injectJsonLd(faqSchema(faq)),
      injectJsonLd(breadcrumbSchema([
        { name: "UNPRO", url: "https://unpro.ca" },
        { name: "Plomb dans l'eau", url: "https://unpro.ca/plomb-eau" },
        { name: cityName, url: `https://unpro.ca/plomb-eau/${citySlug}` },
      ])),
      injectJsonLd({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: `Tuyaux de Plomb à ${cityName} : Votre Immeuble est-il à Risque en ${year}?`,
        author: { "@type": "Organization", name: "UNPRO" },
        publisher: { "@type": "Organization", name: "UNPRO" },
        datePublished: new Date().toISOString().slice(0, 10),
        about: { "@type": "Place", name: cityName, addressRegion: "QC" },
      }),
    ];
    return () => cleanups.forEach((c) => c());
  }, [citySlug, faq, cityName, year]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Chargement…</div>;
  }

  return (
    <>
      <SeoHead
        title={`Tuyaux de Plomb à ${cityName} : Votre Immeuble est-il à Risque en ${year}? — UNPRO`}
        description={`Vérifiez gratuitement le risque de tuyaux en plomb à ${cityName}. Analyse personnalisée par adresse, recommandations et plombier UNPRO recommandé.`}
        canonical={`https://unpro.ca/plomb-eau/${citySlug}`}
      />

      <main className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/40 to-white">
        {/* HERO */}
        <section className="px-4 pt-12 pb-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-2 text-blue-600 text-xs uppercase tracking-wider mb-3">
            <Droplets className="size-4" />
            <span>Sécurité de l'eau · {cityName}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight tracking-tight">
            Tuyaux de Plomb à {cityName} : Votre Immeuble est-il à Risque en {year}?
          </h1>
          <p className="text-muted-foreground mt-3 text-base leading-relaxed">
            Les bâtiments plus anciens peuvent présenter un risque selon l'année, les matériaux et la plomberie interne. Vérifiez votre adresse en moins de 30 secondes.
          </p>

          {profile && (
            <div className="mt-5 flex flex-wrap gap-3">
              <Card className="px-3 py-2 text-xs bg-white/80">
                Indice ville : <span className="font-bold text-blue-700">{profile.risk_index}/100</span>
              </Card>
              {profile.avg_build_year && (
                <Card className="px-3 py-2 text-xs bg-white/80">
                  Année moyenne : <span className="font-bold">{profile.avg_build_year}</span>
                </Card>
              )}
              {profile.public_lead_service_estimated && (
                <Card className="px-3 py-2 text-xs bg-amber-50 border-amber-200">
                  ⚠ Conduites publiques anciennes possibles
                </Card>
              )}
            </div>
          )}
        </section>

        {/* PROPERTY PICKER */}
        <section className="px-4 pb-10 max-w-3xl mx-auto">
          <PlombEauPropertyPicker citySlug={citySlug} cityName={cityName} />
        </section>

        {/* NEIGHBORHOODS */}
        {neighborhoods && neighborhoods.length > 0 && (
          <section className="px-4 pb-10 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MapPin className="size-5 text-blue-600" /> Quartiers à surveiller à {cityName}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {neighborhoods.map((n: any) => (
                <Link
                  key={n.id}
                  to={`/tuyaux-plomb/${n.neighborhood_slug}`}
                  className="p-3 rounded-lg bg-white/80 border hover:border-blue-400 transition"
                >
                  <div className="font-medium text-sm">{n.neighborhood}</div>
                  <div className="text-xs text-muted-foreground">Risque {n.risk_index}/100</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* AFFILIATE / TOOLS */}
        <section className="px-4 pb-10 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FlaskConical className="size-5 text-blue-600" /> Outils utiles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "lead_test_kit", label: "Kit test plomb pour l'eau", url: "https://www.amazon.ca/s?k=lead+water+test+kit" },
              { key: "nsf_filter", label: "Filtre certifié NSF/ANSI 53", url: "https://www.amazon.ca/s?k=NSF+53+water+filter" },
              { key: "water_quality_meter", label: "Détecteur qualité de l'eau", url: "https://www.amazon.ca/s?k=water+quality+meter" },
              { key: "plumbing_inspection_kit", label: "Kit inspection plomberie", url: "https://www.amazon.ca/s?k=plumbing+inspection+camera" },
            ].map((p) => (
              <a
                key={p.key}
                href={p.url}
                target="_blank"
                rel="nofollow sponsored noopener"
                onClick={async () => {
                  try {
                    const { supabase } = await import("@/integrations/supabase/client");
                    await (supabase.from("lead_pipe_affiliate_clicks") as any).insert({
                      product_key: p.key,
                      city_slug: citySlug,
                      destination_url: p.url,
                    });
                  } catch {}
                }}
                className="p-3 bg-white/80 rounded-lg border hover:border-blue-400 text-sm font-medium"
              >
                {p.label}
              </a>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="px-4 pb-10 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ShieldAlert className="size-5 text-blue-600" /> Questions fréquentes
          </h2>
          <div className="space-y-3">
            {faq.map((q, i) => (
              <Card key={i} className="p-4 bg-white/80">
                <div className="font-semibold text-sm mb-1">{q.question}</div>
                <div className="text-sm text-muted-foreground">{q.answer}</div>
              </Card>
            ))}
          </div>
        </section>

        {/* INTERNAL LINKS */}
        {topCities && topCities.length > 0 && (
          <section className="px-4 pb-16 max-w-3xl mx-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <HomeIcon className="size-5 text-blue-600" /> Autres villes à vérifier
            </h2>
            <div className="flex flex-wrap gap-2">
              {topCities.filter((c: any) => c.city_slug !== citySlug).map((c: any) => (
                <Link
                  key={c.city_slug}
                  to={`/plomb-eau/${c.city_slug}`}
                  className="px-3 py-1.5 rounded-full text-xs bg-white border hover:border-blue-400"
                >
                  {c.city} • {c.risk_index}/100
                </Link>
              ))}
            </div>
          </section>
        )}

        <p className="text-[10px] text-muted-foreground text-center pb-6 px-4">
          Analyse indicative. Test certifié recommandé si doute.
        </p>
      </main>
    </>
  );
}

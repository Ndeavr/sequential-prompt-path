import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import PageHero from "@/components/shared/PageHero";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import CityCard from "@/components/shared/CityCard";
import CTASection from "@/components/shared/CTASection";
import { MOCK_CITIES } from "@/data/mockCities";
import { useEffect } from "react";
import { injectJsonLd, collectionPageSchema, breadcrumbSchema } from "@/lib/seoSchema";

export default function VillesDesserviesPage() {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const cleanups = [
      injectJsonLd(collectionPageSchema("Villes desservies", "Entrepreneurs vérifiés dans les principales villes du Québec", "https://unpro.ca/villes-desservies")),
      injectJsonLd(breadcrumbSchema([{ name: "Accueil", url: "https://unpro.ca" }, { name: "Villes desservies", url: "https://unpro.ca/villes-desservies" }])),
    ];
    return () => cleanups.forEach((c) => c());
  }, []);

  const filtered = MOCK_CITIES.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.region.toLowerCase().includes(search.toLowerCase())
  );

  const regions = [...new Set(MOCK_CITIES.map((c) => c.region))];

  return (
    <>
      <Helmet>
        <title>Villes desservies — Entrepreneurs vérifiés | UNPRO</title>
        <meta name="description" content="Trouvez des entrepreneurs vérifiés dans votre ville. Montréal, Laval, Longueuil, Terrebonne et plus." />
        <link rel="canonical" href="https://unpro.ca/villes-desservies" />
        <meta property="og:title" content="Villes desservies | UNPRO" />
      </Helmet>

      <Breadcrumbs items={[{ label: "Villes desservies" }]} />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-10">
        <PageHero title="Villes desservies" subtitle="Trouvez des professionnels vérifiés partout au Québec." compact>
          <div className="relative max-w-md mx-auto mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher une ville..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </PageHero>

        {/* Featured cities */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((city, i) => (
            <motion.div key={city.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <CityCard {...city} />
            </motion.div>
          ))}
        </div>

        {/* Regional grouping */}
        <section className="space-y-6">
          <h2 className="text-xl font-bold text-foreground font-display">Par région</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {regions.map((region) => (
              <div key={region} className="space-y-2">
                <h3 className="font-semibold text-foreground">{region}</h3>
                {MOCK_CITIES.filter((c) => c.region === region).map((c) => (
                  <a key={c.slug} href={`/services/${c.slug}`} className="block text-sm text-muted-foreground hover:text-primary transition-colors pl-2">
                    {c.name} — {c.professionalCount} professionnels
                  </a>
                ))}
              </div>
            ))}
          </div>
        </section>

        <CTASection
          title="Votre ville n'est pas listée?"
          description="Nous étendons notre couverture constamment. Décrivez votre projet et nous vous trouverons un professionnel."
          primaryCta={{ label: "Décrire mon projet", to: "/decrire-mon-projet" }}
          variant="subtle"
        />
      </div>
    </>
  );
}

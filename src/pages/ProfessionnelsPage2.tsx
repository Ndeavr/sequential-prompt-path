import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Star, MapPin, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import PageHero from "@/components/shared/PageHero";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import CTASection from "@/components/shared/CTASection";
import { PROFESSIONAL_CATEGORIES, MOCK_PROFESSIONALS } from "@/data/mockProfessionals";
import { useEffect } from "react";
import { injectJsonLd, collectionPageSchema, breadcrumbSchema } from "@/lib/seoSchema";

// Map icon names to simple display
const ICON_DISPLAY: Record<string, string> = { Hammer: "🔨", Scale: "⚖️", Building2: "🏢", Search: "🔍", BarChart3: "📊", Shield: "🛡️", Map: "🗺️", Gavel: "⚖️", Users: "👥" };

export default function ProfessionnelsPage() {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const cleanups = [
      injectJsonLd(collectionPageSchema("Professionnels", "Annuaire de professionnels vérifiés au Québec", "https://unpro.ca/professionnels")),
      injectJsonLd(breadcrumbSchema([{ name: "Accueil", url: "https://unpro.ca" }, { name: "Professionnels", url: "https://unpro.ca/professionnels" }])),
    ];
    return () => cleanups.forEach((c) => c());
  }, []);

  const filteredPros = MOCK_PROFESSIONALS.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()) || p.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>Professionnels vérifiés — Entrepreneurs, notaires, inspecteurs | UNPRO</title>
        <meta name="description" content="Trouvez des professionnels vérifiés au Québec. Entrepreneurs, notaires, courtiers, inspecteurs et plus. Rendez-vous garanti." />
        <link rel="canonical" href="https://unpro.ca/professionnels" />
      </Helmet>

      <Breadcrumbs items={[{ label: "Professionnels" }]} />

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-10">
        <PageHero title="Professionnels" subtitle="Trouvez le bon expert pour chaque étape de votre projet immobilier." compact>
          <div className="relative max-w-md mx-auto mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un professionnel..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </PageHero>

        {/* Category cards */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {PROFESSIONAL_CATEGORIES.map((cat, i) => (
            <motion.div key={cat.slug} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="hover:shadow-md hover:border-primary/30 transition-all group text-center h-full">
                <CardContent className="p-4 space-y-1">
                  <span className="text-2xl">{ICON_DISPLAY[cat.icon] || "👤"}</span>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{cat.name}</h3>
                  <span className="text-xs text-muted-foreground">{cat.count} profils</span>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Professional profiles */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-foreground font-display">Profils en vedette</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPros.map((pro) => (
              <Card key={pro.id} className="hover:shadow-lg transition-all group h-full">
                <CardContent className="p-5 space-y-3">
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{pro.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                      <span className="text-primary font-medium">{pro.category}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{pro.city}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{pro.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                      <span className="text-sm font-medium">{pro.rating}</span>
                    </div>
                    <div className="flex gap-1.5">
                      {pro.badges.map((b) => (
                        <span key={b} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{b}</span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <CTASection
          title="Vous êtes un professionnel?"
          description="Rejoignez UNPRO et recevez des rendez-vous garantis avec des propriétaires qualifiés."
          primaryCta={{ label: "Créer mon profil", to: "/contractor-onboarding" }}
          secondaryCta={{ label: "Voir les plans", to: "/pricing" }}
          variant="accent"
        />
      </div>
    </>
  );
}

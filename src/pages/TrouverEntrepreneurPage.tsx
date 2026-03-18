import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import PageHero from "@/components/shared/PageHero";
import ContractorCard from "@/components/shared/ContractorCard";
import CTASection from "@/components/shared/CTASection";
import { MOCK_CONTRACTORS } from "@/data/mockContractors";

const FILTER_CATEGORIES = ["Tous", "Toiture", "Isolation", "Fondation", "Plomberie", "Électricité", "Fenêtres", "Thermopompe", "Rénovation générale"];

export default function TrouverEntrepreneurPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("Tous");

  const filtered = MOCK_CONTRACTORS.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === "Tous" || c.category === activeFilter;
    return matchSearch && matchFilter;
  });

  return (
    <>
      <Helmet>
        <title>Trouver un entrepreneur vérifié au Québec | UNPRO</title>
        <meta name="description" content="Trouvez un entrepreneur vérifié pour vos travaux. Aucun spam, aucune soumission multiple. Rendez-vous garanti avec le bon professionnel." />
        <link rel="canonical" href="https://unpro.ca/trouver-un-entrepreneur" />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <PageHero
          title="Trouver un entrepreneur"
          subtitle="Des professionnels vérifiés, un rendez-vous garanti. Fini les soumissions multiples."
          compact
        >
          <div className="relative max-w-xl mx-auto mt-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Toiture, plomberie, isolation, ville..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
        </PageHero>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeFilter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((c) => (
            <ContractorCard key={c.id} {...c} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun entrepreneur trouvé pour ces critères.</p>
          </div>
        )}

        {/* Trust badges */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {["Vérifié", "Réponse rapide", "Disponible", "Diagnostic dispo", "Urgence 24/7"].map((b) => (
            <div key={b} className="text-center p-3 rounded-xl bg-muted/50 text-sm font-medium text-muted-foreground">
              {b}
            </div>
          ))}
        </div>

        <CTASection
          title="Vous ne savez pas qui contacter?"
          description="Décrivez votre projet ou votre problème, et nous vous guiderons vers le bon professionnel."
          primaryCta={{ label: "Décrire mon projet", to: "/decrire-mon-projet" }}
          secondaryCta={{ label: "Parler à Alex", to: "/parler-a-alex" }}
          variant="accent"
        />
      </div>
    </>
  );
}

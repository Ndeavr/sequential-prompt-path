import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import TagInput from "./TagInput";
import CardAvailabilityResult from "./CardAvailabilityResult";
import { useAvailabilityCheck, useCategoriesSearch, useCitiesSearch } from "@/hooks/useAvailabilityCheck";

interface TagItem { slug: string; label: string; }

export default function SectionCheckAvailabilityFounder() {
  const [categoryTags, setCategoryTags] = useState<TagItem[]>([]);
  const [cityTags, setCityTags] = useState<TagItem[]>([]);

  const { results, isChecking, error, checkAvailability, reset } = useAvailabilityCheck();
  const { categories, search: searchCategories } = useCategoriesSearch();
  const { cities, search: searchCities } = useCitiesSearch();

  const handleCheck = useCallback(() => {
    if (categoryTags.length === 0 || cityTags.length === 0) return;
    checkAvailability(
      categoryTags.map((t) => t.slug),
      cityTags.map((t) => t.slug)
    );
  }, [categoryTags, cityTags, checkAvailability]);

  const scrollToPlans = () => {
    document.getElementById("plans-comparison")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="py-16 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center space-y-2"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Vérifiez si votre position est encore ouverte
          </h2>
          <p className="text-muted-foreground">
            Chaque domaine est limité. Certaines villes sont déjà verrouillées.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="space-y-4 rounded-xl border bg-card/30 backdrop-blur-sm p-5"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Domaine(s) d'expertise</label>
            <TagInput
              tags={categoryTags}
              onTagsChange={(t) => { setCategoryTags(t); reset(); }}
              suggestions={categories.map((c) => ({ slug: c.slug, name: c.name, extra: c.rbq_required ? "RBQ" : undefined }))}
              onSearch={searchCategories}
              placeholder="Ex: plomberie, isolation…"
              maxTags={5}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Ville(s)</label>
            <TagInput
              tags={cityTags}
              onTagsChange={(t) => { setCityTags(t); reset(); }}
              suggestions={cities.map((c) => ({ slug: c.slug, name: c.name, extra: c.population ? `${Math.round(c.population / 1000)}k` : undefined }))}
              onSearch={searchCities}
              placeholder="Ex: Montréal, Québec…"
              maxTags={5}
            />
          </div>

          <Button
            onClick={handleCheck}
            disabled={categoryTags.length === 0 || cityTags.length === 0 || isChecking}
            className="w-full gap-2"
            size="lg"
          >
            {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Vérifier maintenant
          </Button>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </motion.div>

        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-3 sm:grid-cols-2"
          >
            {results.map((r, i) => (
              <CardAvailabilityResult key={`${r.category_slug}-${r.city_slug}-${i}`} result={r} onReserve={scrollToPlans} />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

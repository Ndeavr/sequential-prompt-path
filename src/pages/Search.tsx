/**
 * UNPRO — Public Contractor Search Page
 */

import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search as SearchIcon, X, ArrowLeft } from "lucide-react";
import ContractorCard from "@/components/contractor/ContractorCard";
import {
  usePublicContractorSearch,
  usePublicFilterOptions,
  type PublicContractorFilters,
} from "@/hooks/usePublicContractors";

const SORT_OPTIONS = [
  { value: "default", label: "Pertinence" },
  { value: "newest", label: "Plus récents" },
  { value: "aipp", label: "Score AIPP" },
  { value: "reviews", label: "Plus d'avis" },
] as const;

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<PublicContractorFilters>({
    q: searchParams.get("q") ?? "",
    city: searchParams.get("city") ?? "",
    specialty: searchParams.get("category") ?? "",
    sort: (searchParams.get("sort") as PublicContractorFilters["sort"]) ?? "default",
  });

  // Sync filters → URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.city) params.set("city", filters.city);
    if (filters.specialty) params.set("category", filters.specialty);
    if (filters.sort && filters.sort !== "default") params.set("sort", filters.sort);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const { data: contractors, isLoading, isError } = usePublicContractorSearch(filters);
  const { data: filterOptions } = usePublicFilterOptions();

  const clearFilters = () => setFilters({ q: "", city: "", specialty: "", sort: "default" });
  const hasFilters = !!(filters.q || filters.city || filters.specialty);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="shrink-0">
              <Link to="/"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Trouver un entrepreneur</h1>
              <p className="text-sm text-muted-foreground">
                Recherchez par nom, ville ou spécialité
              </p>
            </div>
          </div>

          {/* Search input */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nom de l'entreprise…"
              className="pl-10"
              value={filters.q ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap gap-2">
            <Select
              value={filters.city || "__all__"}
              onValueChange={(v) => setFilters((f) => ({ ...f, city: v === "__all__" ? "" : v }))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Ville" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toutes les villes</SelectItem>
                {filterOptions?.cities.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.specialty || "__all__"}
              onValueChange={(v) => setFilters((f) => ({ ...f, specialty: v === "__all__" ? "" : v }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Spécialité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toutes les spécialités</SelectItem>
                {filterOptions?.specialties.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.sort ?? "default"}
              onValueChange={(v) => setFilters((f) => ({ ...f, sort: v as PublicContractorFilters["sort"] }))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-3 w-3" /> Effacer
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        {isLoading && (
          <p className="text-center text-muted-foreground py-12">Chargement…</p>
        )}

        {isError && (
          <p className="text-center text-destructive py-12">
            Une erreur est survenue. Veuillez réessayer.
          </p>
        )}

        {!isLoading && !isError && contractors && contractors.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <p className="text-lg font-medium text-foreground">Aucun entrepreneur trouvé</p>
            <p className="text-sm text-muted-foreground">
              {hasFilters
                ? "Essayez d'ajuster vos filtres."
                : "Aucun entrepreneur vérifié n'est disponible pour le moment."}
            </p>
            {hasFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
                Effacer les filtres
              </Button>
            )}
          </div>
        )}

        {!isLoading && !isError && contractors && contractors.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              {contractors.length} résultat{contractors.length > 1 ? "s" : ""}
            </p>
            <div className="space-y-3">
              {contractors.map((c) => (
                <ContractorCard key={c.id} contractor={c} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Search;

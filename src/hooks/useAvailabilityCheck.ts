import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AvailabilityStatus = "available" | "limited" | "locked";

export interface AvailabilityResult {
  category_slug: string;
  city_slug: string;
  category_name: string;
  city_name: string;
  status: AvailabilityStatus;
  pressure_score: number;
  suggestions: { name: string; slug: string; population: number }[];
}

export function useAvailabilityCheck() {
  const [results, setResults] = useState<AvailabilityResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAvailability = async (categorySlugs: string[], citySlugs: string[]) => {
    if (categorySlugs.length === 0 || citySlugs.length === 0) return;
    setIsChecking(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("check_territory_availability", {
        p_category_slugs: categorySlugs,
        p_city_slugs: citySlugs,
      });
      if (rpcError) throw rpcError;
      setResults((data as unknown as AvailabilityResult[]) ?? []);
    } catch (e: any) {
      setError(e.message ?? "Erreur de vérification");
      setResults([]);
    } finally {
      setIsChecking(false);
    }
  };

  const reset = () => {
    setResults([]);
    setError(null);
  };

  return { results, isChecking, error, checkAvailability, reset };
}

export function useCategoriesSearch() {
  const [categories, setCategories] = useState<{ slug: string; name: string; rbq_required: boolean }[]>([]);

  const search = async (query: string) => {
    const { data } = await supabase
      .from("categories")
      .select("slug, name, rbq_required")
      .eq("is_active", true)
      .ilike("name", `%${query}%`)
      .order("priority", { ascending: true })
      .limit(15);
    setCategories((data as any[]) ?? []);
  };

  return { categories, search };
}

export function useCitiesSearch() {
  const [cities, setCities] = useState<{ slug: string; name: string; population: number }[]>([]);

  const search = async (query: string) => {
    const { data } = await supabase
      .from("cities")
      .select("slug, name, population")
      .eq("is_active", true)
      .ilike("name", `%${query}%`)
      .order("population", { ascending: false })
      .limit(15);
    setCities((data as any[]) ?? []);
  };

  return { cities, search };
}

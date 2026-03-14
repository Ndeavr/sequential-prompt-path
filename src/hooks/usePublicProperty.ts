/**
 * UNPRO — usePublicProperty hook
 * Fetches a property by slug for the public property page.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchPropertyBySlug } from "@/services/property/propertyService";

export const usePublicProperty = (slug: string | undefined) => {
  return useQuery({
    queryKey: ["public-property", slug],
    queryFn: () => fetchPropertyBySlug(slug!),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * UNPRO — Internal Link Grid
 * Renders a grid of related internal links for SEO cross-linking.
 */
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  city?: string | null;
  category?: string | null;
  problem?: string | null;
}

export default function InternalLinkGrid({ city, category }: Props) {
  const { data: cities } = useQuery({
    queryKey: ["seo-cities-links"],
    queryFn: async () => {
      const { data } = await supabase.from("cities").select("name, slug").eq("is_active", true).limit(12);
      return data || [];
    },
    staleTime: 60_000,
  });

  const { data: problems } = useQuery({
    queryKey: ["seo-problems-links"],
    queryFn: async () => {
      const { data } = await supabase.from("home_problems").select("name_fr, slug").eq("is_active", true).limit(8);
      return (data || []).map(p => ({ name: p.name_fr, slug: p.slug }));
    },
    staleTime: 60_000,
  });

  return (
    <section className="mt-12 border-t border-border/30 pt-8">
      <h2 className="text-lg font-semibold mb-4">Liens connexes</h2>

      {cities && cities.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Villes desservies</h3>
          <div className="flex flex-wrap gap-2">
            {cities.map(c => (
              <Link key={c.slug} to={`/ville/${c.slug}`} className="text-sm text-primary hover:underline px-2 py-1 rounded bg-primary/5">
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {problems && problems.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Problèmes résidentiels</h3>
          <div className="flex flex-wrap gap-2">
            {problems.map(p => (
              <Link key={p.slug} to={`/probleme/${p.slug}`} className="text-sm text-primary hover:underline px-2 py-1 rounded bg-primary/5">
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {city && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Explorer</h3>
          <div className="flex flex-wrap gap-2">
            <Link to="/services" className="text-sm text-primary hover:underline px-2 py-1 rounded bg-primary/5">Tous les services</Link>
            <Link to="/entrepreneurs" className="text-sm text-primary hover:underline px-2 py-1 rounded bg-primary/5">Entrepreneurs vérifiés</Link>
            <Link to="/blog" className="text-sm text-primary hover:underline px-2 py-1 rounded bg-primary/5">Blog</Link>
          </div>
        </div>
      )}
    </section>
  );
}

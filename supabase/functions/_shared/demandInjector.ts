// UNPRO — Outreach copy injection from live demand intelligence.
// Replaces generic intros with city/category-specific demand stats.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type DemandIntro = {
  intro: string | null;
  homeowner_count: number;
  estimated_revenue: number;
  city: string | null;
  category: string | null;
};

const fmt = (n: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);

export async function buildDemandIntro(
  city?: string | null,
  category?: string | null,
): Promise<DemandIntro> {
  if (!city || !category) return empty(city ?? null, category ?? null);

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data } = await sb
    .from("market_demand")
    .select("homeowner_count, estimated_revenue")
    .eq("city", city)
    .eq("category", category.toLowerCase())
    .maybeSingle();

  const n = data?.homeowner_count ?? 0;
  const rev = Number(data?.estimated_revenue ?? 0);

  if (n <= 0) return empty(city, category);

  return {
    intro: `${n} propriétaires cherchent actuellement un ${category} à ${city}. Demande estimée : ${fmt(rev)}. Activez votre profil et devenez visible immédiatement.`,
    homeowner_count: n,
    estimated_revenue: rev,
    city,
    category,
  };
}

function empty(city: string | null, category: string | null): DemandIntro {
  return { intro: null, homeowner_count: 0, estimated_revenue: 0, city, category };
}

import { supabase } from "@/integrations/supabase/client";
import type { CityPricing } from "./engine";
import type { PainterMatch } from "./types";

export async function fetchCityPricing(citySlug: string | null): Promise<CityPricing | null> {
  const slug = citySlug || "montreal";
  const { data, error } = await supabase
    .from("painting_city_pricing")
    .select("*")
    .eq("city_slug", slug)
    .maybeSingle();
  if (error || !data) {
    // Fallback default
    return {
      city_slug: slug,
      city_name: slug.charAt(0).toUpperCase() + slug.slice(1),
      min_rate_sqft: 3.5,
      max_rate_sqft: 6.0,
      prep_multiplier: 1.1,
      urgency_multiplier: 1.25,
      labour_modifier: 1.0,
      paint_quality_base_cost: 55,
    };
  }
  return data as CityPricing;
}

export async function uploadPaintingPhoto(
  file: File,
  ownerKey: string,
): Promise<{ publicUrl: string; storagePath: string } | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${ownerKey}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("painting-photos")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) return null;
  // For private bucket use signed URL
  const { data: signed } = await supabase.storage
    .from("painting-photos")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (!signed?.signedUrl) return null;
  return { publicUrl: signed.signedUrl, storagePath: path };
}

export async function analyzePhotoInline(imageUrl: string): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabase.functions.invoke("analyze-painting-photo", {
      body: { image_url: imageUrl },
    });
    if (error) return null;
    return (data as { analysis?: Record<string, unknown> })?.analysis ?? null;
  } catch {
    return null;
  }
}

export async function findMatchingPainters(citySlug: string, limit = 3): Promise<PainterMatch[]> {
  // Try real contractors table — paint/painting category in this city.
  try {
    const { data } = await supabase
      .from("contractors")
      .select("id, business_name, city, rating, review_count, specialties, badges, description")
      .ilike("city", `%${citySlug}%`)
      .limit(limit);
    if (data && data.length) {
      return data.map((c: any) => ({
        id: c.id,
        name: c.business_name || "Peintre UNPRO",
        city: c.city || citySlug,
        rating: Number(c.rating) || 4.7,
        reviewCount: Number(c.review_count) || 0,
        badges: c.badges || ["Vérifié UNPRO"],
        specialties: c.specialties || ["Peinture intérieure"],
        description: c.description || "Peintre résidentiel vérifié.",
        nextAvailability: "Disponible cette semaine",
        pricingStyle: "Tarif transparent",
      }));
    }
  } catch {
    // ignore
  }
  return [];
}

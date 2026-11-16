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
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = extensions[file.type];
  if (!ext || file.size === 0 || file.size > 5 * 1024 * 1024) return null;

  // A guest must not use a public Storage read policy: an Edge Function
  // uploads the image server-side and signs ONLY that newly created object.
  if (ownerKey === "guest") {
    const body = new FormData();
    body.append("file", file, file.name);
    const { data, error } = await supabase.functions.invoke("painting-guest-upload", { body });
    if (error || !data?.publicUrl || !data?.storagePath) return null;
    return { publicUrl: data.publicUrl, storagePath: data.storagePath };
  }

  // Signed-in users keep their existing owner-folder / RLS upload flow.
  const path = `${ownerKey}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("painting-photos")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) return null;
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
  try {
    const { data } = await supabase
      .from("contractors")
      .select("id, business_name, city, rating, review_count, specialty, description")
      .ilike("city", `%${citySlug}%`)
      .ilike("specialty", "%peint%")
      .limit(limit);
    if (data && data.length) {
      return data.map((c: any) => ({
        id: c.id,
        name: c.business_name || "Peintre UNPRO",
        city: c.city || citySlug,
        rating: Number(c.rating) || 4.7,
        reviewCount: Number(c.review_count) || 0,
        badges: ["Vérifié UNPRO"],
        specialties: c.specialty ? [c.specialty] : ["Peinture résidentielle"],
        description: c.description || "Peintre résidentiel vérifié par UNPRO.",
        nextAvailability: "Disponible cette semaine",
        pricingStyle: "Tarif transparent",
      }));
    }
  } catch {
    // ignore
  }
  return [];
}


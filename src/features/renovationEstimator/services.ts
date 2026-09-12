/**
 * Accès données du calculateur de rénovation.
 * Aucune donnée inventée : si la source est vide, on retourne vide.
 */
import { supabase } from "@/integrations/supabase/client";
import type { BenchmarkRow } from "./engine";

export interface ApprovedProjectVideo {
  id: string;
  title: string;
  description: string | null;
  url: string;
  poster: string | null;
}

/** Références de marché réellement mesurées (jamais générées). */
export async function fetchBenchmarks(): Promise<BenchmarkRow[]> {
  try {
    const { data, error } = await supabase
      .from("market_price_benchmarks")
      .select("component, avg_cost_per_unit, unit_type, sample_count, last_updated_from_actuals")
      .eq("region", "quebec");
    if (error || !data) return [];
    return data as unknown as BenchmarkRow[];
  } catch {
    return [];
  }
}

/**
 * Vidéos de projets réelles et approuvées uniquement.
 * Zéro enregistrement approuvé ⇒ la section disparaît proprement.
 */
export async function fetchApprovedProjectVideos(limit = 4): Promise<ApprovedProjectVideo[]> {
  try {
    const { data, error } = await supabase
      .from("contractor_media")
      .select("id, title, description, public_url, media_type, is_approved, display_order")
      .eq("media_type", "video")
      .eq("is_approved", true)
      .not("public_url", "is", null)
      .order("display_order", { ascending: true })
      .limit(limit);
    if (error || !data) return [];
    return (data as unknown as Array<Record<string, unknown>>)
      .filter((r) => typeof r.public_url === "string" && (r.public_url as string).length > 0)
      .map((r) => ({
        id: String(r.id),
        title: (r.title as string) || "Projet réalisé",
        description: (r.description as string) ?? null,
        url: r.public_url as string,
        poster: null,
      }));
  } catch {
    return [];
  }
}

export interface SaveEstimatePayload {
  idempotency_key: string;
  first_name?: string | null;
  email?: string | null;
  category: string;
  category_label: string;
  city?: string | null;
  postal_code?: string | null;
  /** Adresse vérifiée par Google Places — obligatoire pour la conversion. */
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  property_type?: string | null;
  budget_min: number;
  budget_max: number;
  estimate: Record<string, unknown>;
  inputs: Record<string, unknown>;
  attribution: Record<string, unknown>;
  source_page: string;
  consent_marketing: boolean;
}

export interface SaveEstimateResult {
  projectId: string;
  leadId: string | null;
  hasMatches: boolean;
  reused: boolean;
}

/** Conversion canonique et idempotente (projet + propriété + lead + matching). */
export async function saveEstimateProject(
  payload: SaveEstimatePayload,
): Promise<SaveEstimateResult> {
  const { data, error } = await supabase.functions.invoke("create-project-unified", {
    body: { ...payload, source: "renovation_calculator" },
  });
  if (error) throw new Error(error.message || "save_failed");
  const res = data as Partial<SaveEstimateResult> & { error?: string };
  if (res?.error) throw new Error(res.error);
  if (!res?.projectId) throw new Error("save_failed");
  return {
    projectId: res.projectId,
    leadId: res.leadId ?? null,
    hasMatches: !!res.hasMatches,
    reused: !!res.reused,
  };
}

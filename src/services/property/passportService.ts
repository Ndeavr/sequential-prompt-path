/**
 * UNPRO — Passeport Maison Service
 * Manages passport sections, completion score, and section data.
 */
import { supabase } from "@/integrations/supabase/client";

export const PASSPORT_SECTIONS = [
  { key: "basic_info", label: "Informations de base", icon: "Home", weight: 20 },
  { key: "structure_systems", label: "Structure et systèmes", icon: "Wrench", weight: 25 },
  { key: "renovations", label: "Historique des rénovations", icon: "Hammer", weight: 20 },
  { key: "energy_equipment", label: "Énergie et équipements", icon: "Zap", weight: 20 },
  { key: "documents_photos", label: "Documents et photos", icon: "FileText", weight: 15 },
] as const;

export type PassportSectionKey = typeof PASSPORT_SECTIONS[number]["key"];

export interface PassportOverview {
  sections: Array<{
    key: PassportSectionKey;
    label: string;
    icon: string;
    weight: number;
    completionPct: number;
    data: Record<string, unknown>;
  }>;
  totalCompletion: number;
  level: "débutant" | "intermédiaire" | "avancé" | "expert" | "certifié";
}

/**
 * Get or initialize passport sections for a property.
 */
export async function getPassportOverview(propertyId: string): Promise<PassportOverview> {
  const { data: existing, error } = await supabase
    .from("property_passport_sections")
    .select("section_key, section_data, completion_pct")
    .eq("property_id", propertyId);

  if (error) throw error;

  const sectionMap = new Map(
    (existing || []).map((s) => [s.section_key, s])
  );

  const sections = PASSPORT_SECTIONS.map((def) => {
    const record = sectionMap.get(def.key);
    return {
      key: def.key,
      label: def.label,
      icon: def.icon,
      weight: def.weight,
      completionPct: (record?.completion_pct as number) ?? 0,
      data: (record?.section_data as Record<string, unknown>) ?? {},
    };
  });

  // Weighted average
  const totalWeight = sections.reduce((s, sec) => s + sec.weight, 0);
  const totalCompletion = Math.round(
    sections.reduce((s, sec) => s + (sec.completionPct * sec.weight) / totalWeight, 0)
  );

  const level = getCompletionLevel(totalCompletion);

  return { sections, totalCompletion, level };
}

/**
 * Update a passport section's data and completion.
 */
export async function updatePassportSection(
  propertyId: string,
  sectionKey: string,
  sectionData: Record<string, unknown>,
  completionPct: number
) {
  // Check if exists
  const { data: existing } = await supabase
    .from("property_passport_sections")
    .select("id")
    .eq("property_id", propertyId)
    .eq("section_key", sectionKey)
    .maybeSingle();

  const payload = {
    section_data: sectionData as unknown as Record<string, unknown>,
    completion_pct: Math.min(100, Math.max(0, completionPct)),
    updated_at: new Date().toISOString(),
  };

  let data, error;
  if (existing) {
    ({ data, error } = await supabase
      .from("property_passport_sections")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single());
  } else {
    ({ data, error } = await supabase
      .from("property_passport_sections")
      .insert({ ...payload, property_id: propertyId, section_key: sectionKey })
      .select()
      .single());
  }

  if (error) throw error;
  return data;
}

function getCompletionLevel(pct: number): PassportOverview["level"] {
  if (pct >= 90) return "certifié";
  if (pct >= 70) return "expert";
  if (pct >= 45) return "avancé";
  if (pct >= 20) return "intermédiaire";
  return "débutant";
}

export function getLevelBadge(level: PassportOverview["level"]) {
  const map: Record<string, { emoji: string; color: string }> = {
    débutant: { emoji: "🌱", color: "text-muted-foreground" },
    intermédiaire: { emoji: "🔧", color: "text-accent" },
    avancé: { emoji: "⭐", color: "text-warning" },
    expert: { emoji: "🏆", color: "text-primary" },
    certifié: { emoji: "💎", color: "text-primary" },
  };
  return map[level] || map.débutant;
}

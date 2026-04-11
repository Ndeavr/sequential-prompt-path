import { supabase } from "@/integrations/supabase/client";

export interface ShareImageTemplate {
  id: string;
  name: string;
  intent: string;
  layout_type: string;
  background_type: string;
  font_style: string;
  text_rules_json: Record<string, unknown>;
  image_rules_json: Record<string, unknown>;
  brand_rules_json: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShareImageVariant {
  id: string;
  template_id: string;
  variant_name: string;
  title_text: string;
  subtitle_text: string | null;
  image_asset_id: string | null;
  performance_score: number;
  is_active: boolean;
  created_at: string;
}

export interface ShareImageGeneration {
  id: string;
  template_id: string | null;
  variant_id: string | null;
  generated_image_url: string | null;
  width: number;
  height: number;
  generation_time_ms: number | null;
  intent: string | null;
  persona: string | null;
  city: string | null;
  service: string | null;
  contractor_name: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface GenerateImageParams {
  intent: string;
  persona?: string;
  city?: string;
  service?: string;
  contractor_name?: string;
  score?: number;
  cta?: string;
  variant?: string;
  template_id?: string;
  width?: number;
  height?: number;
}

export async function listTemplates() {
  const { data, error } = await supabase.functions.invoke("share-image-generate", {
    body: { action: "list_templates" },
  });
  if (error) throw error;
  return data.templates as ShareImageTemplate[];
}

export async function listGenerations(limit = 50) {
  const { data, error } = await supabase.functions.invoke("share-image-generate", {
    body: { action: "list_generations", limit },
  });
  if (error) throw error;
  return data.generations as ShareImageGeneration[];
}

export async function generateImage(params: GenerateImageParams) {
  const { data, error } = await supabase.functions.invoke("share-image-generate", {
    body: { action: "generate", ...params },
  });
  if (error) throw error;
  return data;
}

export async function previewImage(params: GenerateImageParams) {
  const { data, error } = await supabase.functions.invoke("share-image-generate", {
    body: { action: "preview", ...params },
  });
  if (error) throw error;
  return data;
}

export async function createTemplate(template: Partial<ShareImageTemplate>) {
  const { data, error } = await supabase
    .from("share_image_templates")
    .insert(template as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTemplate(id: string, updates: Partial<ShareImageTemplate>) {
  const { data, error } = await supabase
    .from("share_image_templates")
    .update(updates as any)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTemplate(id: string) {
  const { error } = await supabase.from("share_image_templates").delete().eq("id", id);
  if (error) throw error;
}

export async function createVariant(variant: Partial<ShareImageVariant>) {
  const { data, error } = await supabase
    .from("share_image_variants")
    .insert(variant as any)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Intent configs for UI
export const INTENTS = [
  { value: "homeowner_problem", label: "Propriétaire — Problème", icon: "🏠" },
  { value: "quote_analysis", label: "Analyse de soumission", icon: "📊" },
  { value: "contractor_score", label: "Score entrepreneur", icon: "⭐" },
  { value: "booking", label: "Réservation", icon: "📅" },
  { value: "condo_compliance", label: "Copropriété / Loi 16", icon: "🏢" },
] as const;

export const LAYOUTS = [
  { value: "overlay", label: "Image + Overlay texte" },
  { value: "split", label: "Split (image + texte)" },
  { value: "minimal", label: "Minimal UI" },
] as const;

export const VARIANTS = [
  { value: "A", label: "Safe", description: "Classique, rassurant" },
  { value: "B", label: "Agressive", description: "Urgence, perte" },
  { value: "C", label: "Ultra minimal", description: "Épuré, premium" },
] as const;
